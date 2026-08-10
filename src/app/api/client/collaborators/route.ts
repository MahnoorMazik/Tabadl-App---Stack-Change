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
import { sendWhatsAppMessage } from '@/lib/whatsapp/whatsapp-client'
import {
  COLLABORATOR_INVITE_EXPIRY_MS,
  createCollaboratorInviteToken,
} from '@/lib/collaboration'
import { checkRateLimit } from '@/lib/rate-limit'

export const OPTIONS = () => handleCorsPreflight()

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  sendWhatsApp: z.boolean().optional(),
  phone: z.string().optional(),
})

async function requireClientOwner(request: NextRequest) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return { error: authResult.error || 'Authentication required', status: authResult.status || 401 }
  }
  if (authResult.user.role !== UserRole.CLIENT) {
    return { error: 'Only clients can manage collaborators', status: 403 }
  }
  const client = await db.client.findFirst({
    where: { userId: authResult.user.userId, isDeleted: false },
    select: { id: true, name: true, email: true, phone: true, company: true },
  })
  if (!client) {
    return { error: 'Client profile not found', status: 404 }
  }
  return { user: authResult.user, client }
}

/** GET /api/client/collaborators — list invites for this client */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  try {
    const owner = await requireClientOwner(request)
    if ('error' in owner) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.AUTHORIZATION_ERROR, String(owner.error), owner.status ?? 400, { requestId })
      )
    }

    const rows = await db.clientCollaborator.findMany({
      where: { clientId: owner.client.id },
      orderBy: { invitedAt: 'desc' },
      include: {
        collaboratorUser: {
          select: { id: true, name: true, email: true, lastLoginAt: true },
        },
      },
    })

    return addCorsHeaders(
      createSuccessResponse({ collaborators: rows }, 200, { requestId })
    )
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { code: ErrorCodes.INTERNAL_ERROR, requestId, endpoint: 'GET /api/client/collaborators' })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to load collaborators', 500, {
        requestId,
      })
    )
  }
}

/** POST /api/client/collaborators — invite by email */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  try {
    const owner = await requireClientOwner(request)
    if ('error' in owner) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.AUTHORIZATION_ERROR, String(owner.error), owner.status ?? 400, { requestId })
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
    const rate = checkRateLimit(`collab-invite:${owner.client.id}:${email}`, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000,
      message: 'Too many invites for this email. Try again later.',
    })
    if (rate) return addCorsHeaders(rate)

    if (email === owner.client.email.toLowerCase() || email === owner.user.email.toLowerCase()) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'You cannot invite yourself as a collaborator',
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

    if (existingUser?.role === UserRole.COLLABORATOR) {
      const linked = await db.clientCollaborator.findFirst({
        where: {
          collaboratorUserId: existingUser.id,
          status: CollaborationInviteStatus.ACCEPTED,
        },
      })
      if (linked) {
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

    const existingInvite = await db.clientCollaborator.findUnique({
      where: {
        clientId_inviteEmail: {
          clientId: owner.client.id,
          inviteEmail: email,
        },
      },
    })

    if (existingInvite?.status === CollaborationInviteStatus.ACCEPTED) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'This email is already an accepted collaborator on your account',
          409,
          { requestId }
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
          collaboratorUserId: null,
        },
      })
    } else {
      invite = await db.clientCollaborator.create({
        data: {
          clientId: owner.client.id,
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
      clientName: owner.client.company || owner.client.name,
      inviterName: owner.user.name,
    })

    let whatsappSent = false
    const phone = parsed.data.phone?.trim() || undefined
    if (parsed.data.sendWhatsApp && phone) {
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/collaborator/${token}`
      const wa = await sendWhatsAppMessage({
        to: phone,
        message: `${owner.client.name} invited you to collaborate on Tabadl Alkon. Accept: ${inviteUrl}`,
      })
      whatsappSent = wa.success
    }

    return addCorsHeaders(
      createSuccessResponse(
        {
          collaborator: invite,
          emailSent: emailResult.success,
          emailError: emailResult.error,
          whatsappSent,
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
    logError(error instanceof Error ? error : new Error(String(error)), { code: ErrorCodes.INTERNAL_ERROR, requestId, endpoint: 'POST /api/client/collaborators' })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to send invite', 500, {
        requestId,
      })
    )
  }
}
