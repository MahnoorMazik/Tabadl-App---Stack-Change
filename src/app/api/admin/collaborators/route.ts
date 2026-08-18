import { NextRequest } from 'next/server'
import { CollaborationInviteStatus, UserRole } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  getRequestId,
  logError,
} from '@/lib/error-handler'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'
import { requireAuth } from '@/lib/rbac-middleware'
import { sendCollaboratorInviteEmail } from '@/lib/email'
import {
  COLLABORATOR_INVITE_EXPIRY_MS,
  createCollaboratorInviteToken,
} from '@/lib/collaboration'
import { checkRateLimit } from '@/lib/rate-limit'

export const OPTIONS = () => handleCorsPreflight()

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  clientId: z.string().optional(),
  sendWhatsApp: z.boolean().optional(),
  phone: z.string().optional(),
})

async function requireAdminAccess(request: NextRequest) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return { error: authResult.error || 'Authentication required', status: authResult.status || 401 }
  }
  if (authResult.user.role !== UserRole.ADMIN && authResult.user.role !== UserRole.STAFF) {
    return { error: 'Only admins can manage collaborators', status: 403 }
  }
  return { user: authResult.user }
}

/** GET /api/admin/collaborators — list all collaborators across all clients */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  try {
    const admin = await requireAdminAccess(request)
    if ('error' in admin) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.AUTHORIZATION_ERROR,
          admin.error || 'Authorization failed',
          admin.status || 403,
          { requestId }
        )
      )
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where: any = {}
    
    if (clientId) {
      where.clientId = clientId
    }
    
    if (status) {
      where.status = status as CollaborationInviteStatus
    }
    
    // ✅ SQLite compatible search - no 'mode' parameter
    if (search) {
      where.inviteEmail = { contains: search }
    }

    const rows = await db.clientCollaborator.findMany({
      where,
      orderBy: { invitedAt: 'desc' },
      include: {
        collaboratorUser: {
          select: { id: true, name: true, email: true, lastLoginAt: true },
        },
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            clientNumber: true,
          }
        }
      },
    })

    // Get all clients for filter dropdown
    const clients = await db.client.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        company: true,
        clientNumber: true,
      },
      orderBy: { name: 'asc' }
    })

    return addCorsHeaders(
      createSuccessResponse(
        { 
          collaborators: rows,
          clients: clients 
        }, 
        200, 
        { requestId }
      )
    )
  } catch (error) {
    console.error('[Admin Collaborators GET] Error:', error)
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/admin/collaborators',
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to load collaborators', 500, {
        requestId,
      })
    )
  }
}

/** POST /api/admin/collaborators — invite by email (admin can invite for any client) */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  try {
    const admin = await requireAdminAccess(request)
    if ('error' in admin) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.AUTHORIZATION_ERROR,
          admin.error || 'Authorization failed',
          admin.status || 403,
          { requestId }
        )
      )
    }

    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          parsed.error.issues[0]?.message || 'Invalid input',
          400,
          { requestId }
        )
      )
    }

    const email = parsed.data.email.trim().toLowerCase()
    const clientId = parsed.data.clientId

    if (!clientId) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Client ID is required',
          400,
          { requestId }
        )
      )
    }

    // Check if client exists
    const client = await db.client.findFirst({
      where: { id: clientId, isDeleted: false },
      select: { id: true, name: true, email: true, company: true },
    })

    if (!client) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Client not found',
          404,
          { requestId }
        )
      )
    }

    const rate = checkRateLimit(`admin-collab-invite:${clientId}:${email}`, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000,
      message: 'Too many invites for this client/email. Try again later.',
    })
    if (rate) return addCorsHeaders(rate)

    if (email === client.email.toLowerCase()) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'You cannot invite the client owner as a collaborator',
          400,
          { requestId }
        )
      )
    }

    const existingUser = await db.user.findFirst({
      where: { email, isDeleted: false },
    })

    if (existingUser?.role === UserRole.CLIENT || existingUser?.role === UserRole.STAFF) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'This email already belongs to another account type and cannot be invited as a collaborator',
          409,
          { requestId }
        )
      )
    }

    // ✅ Updated: Check if collaborator is already linked
    if (existingUser?.role === UserRole.COLLABORATOR) {
      const linked = await db.clientCollaborator.findFirst({
        where: {
          collaboratorUserId: existingUser.id,
          status: CollaborationInviteStatus.ACCEPTED,
        },
      })
      
      if (linked) {
        // ✅ If collaborator is linked to THIS client, allow re-invite
        if (linked.clientId === clientId) {
          console.log(`✅ Collaborator ${email} already linked to this client, allowing re-invite`)
          // Continue with the flow - will update existing invite or create new one
        } else {
          // ❌ If linked to a DIFFERENT client, reject
          return addCorsHeaders(
            createErrorResponse(
              ErrorCodes.VALIDATION_ERROR,
              'This collaborator is already linked to another client. A collaborator can only work with one client.',
              409,
              { requestId }
            )
          )
        }
      }
    }

    const existingInvite = await db.clientCollaborator.findUnique({
      where: {
        clientId_inviteEmail: {
          clientId: client.id,
          inviteEmail: email,
        },
      },
    })

    // ✅ Check if there's already an ACCEPTED invite for this client
    if (existingInvite?.status === CollaborationInviteStatus.ACCEPTED) {
      // ✅ If ACCEPTED, we can revoke it and create a new one, or just update it
      // Option: Update the existing accepted invite to PENDING (re-invite)
      const token = createCollaboratorInviteToken()
      const expiresAt = new Date(Date.now() + COLLABORATOR_INVITE_EXPIRY_MS)
      
      const updated = await db.clientCollaborator.update({
        where: { id: existingInvite.id },
        data: {
          inviteToken: token,
          status: CollaborationInviteStatus.PENDING,
          invitedAt: new Date(),
          expiresAt,
          acceptedAt: null,
          revokedAt: null,
          collaboratorUserId: existingUser?.id || null,
        },
      })
      
      const emailResult = await sendCollaboratorInviteEmail({
        to: email,
        inviteToken: token,
        clientName: client.company || client.name,
        inviterName: admin.user.name || 'Admin',
      })

      return addCorsHeaders(
        createSuccessResponse(
          {
            collaborator: updated,
            client: client,
            emailSent: emailResult.success,
            emailError: emailResult.error,
            message: 'Collaborator re-invited successfully',
          },
          200,
          { requestId, message: 'Collaborator invite resent' }
        )
      )
    }

    const token = createCollaboratorInviteToken()
    const expiresAt = new Date(Date.now() + COLLABORATOR_INVITE_EXPIRY_MS)

    let invite
    if (
      existingInvite &&
      (existingInvite.status === CollaborationInviteStatus.PENDING ||
        existingInvite.status === CollaborationInviteStatus.EXPIRED ||
        existingInvite.status === CollaborationInviteStatus.REVOKED)
    ) {
      invite = await db.clientCollaborator.update({
        where: { id: existingInvite.id },
        data: {
          inviteToken: token,
          status: CollaborationInviteStatus.PENDING,
          invitedAt: new Date(),
          expiresAt,
          acceptedAt: null,
          revokedAt: null,
          collaboratorUserId: existingUser?.id || null,
        },
      })
    } else {
      invite = await db.clientCollaborator.create({
        data: {
          clientId: client.id,
          inviteEmail: email,
          inviteToken: token,
          status: CollaborationInviteStatus.PENDING,
          expiresAt,
        },
      })
    }

    const emailResult = await sendCollaboratorInviteEmail({
      to: email,
      inviteToken: token,
      clientName: client.company || client.name,
      inviterName: admin.user.name || 'Admin',
    })

    return addCorsHeaders(
      createSuccessResponse(
        {
          collaborator: invite,
          client: client,
          emailSent: emailResult.success,
          emailError: emailResult.error,
        },
        201,
        { requestId, message: 'Collaborator invite sent' }
      )
    )
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'An invite for this email already exists',
          409,
          { requestId }
        )
      )
    }
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/admin/collaborators',
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to send invite', 500, {
        requestId,
      })
    )
  }
}