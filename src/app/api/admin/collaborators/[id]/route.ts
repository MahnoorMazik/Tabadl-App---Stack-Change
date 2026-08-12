import { NextRequest } from 'next/server'
import { CollaborationInviteStatus, UserRole } from '@prisma/client'
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

/**
 * DELETE /api/admin/collaborators/[id]?action=revoke  → Soft delete (REVOKED)
 * DELETE /api/admin/collaborators/[id]?action=delete → Permanent delete
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = await context.params
    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'revoke'

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

    // Check if collaborator exists
    const collaborator = await db.clientCollaborator.findUnique({
      where: { id },
      include: {
        client: true,
        collaboratorUser: true,
      }
    })

    if (!collaborator) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR, // ✅ Changed from NOT_FOUND to VALIDATION_ERROR
          'Collaborator not found',
          404,
          { requestId }
        )
      )
    }

    // ✅ REVOKE ACTION - Soft delete (default)
    if (action === 'revoke') {
      const updated = await db.clientCollaborator.update({
        where: { id: collaborator.id },
        data: {
          status: CollaborationInviteStatus.REVOKED,
          revokedAt: new Date(),
          collaboratorUserId: null,
          acceptedAt: null,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              company: true,
            }
          },
          collaboratorUser: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })

      return addCorsHeaders(
        createSuccessResponse(
          {
            collaborator: updated,
            action: 'revoked',
            message: 'Collaborator access revoked successfully',
          },
          200,
          { requestId }
        )
      )
    }

    // ✅ DELETE ACTION - Permanent delete
    if (action === 'delete') {
      // Permanently delete the collaborator relationship
      await db.clientCollaborator.delete({
        where: { id: collaborator.id },
      })

      return addCorsHeaders(
        createSuccessResponse(
          {
            action: 'permanently_deleted',
            message: 'Collaborator permanently deleted',
          },
          200,
          { requestId }
        )
      )
    }

    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid action. Use "revoke" or "delete"',
        400,
        { requestId }
      )
    )

  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/admin/collaborators/[id]',
      method: 'DELETE',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to process request', 500, {
        requestId,
      })
    )
  }
}

/** POST /api/admin/collaborators/[id] — resend invite */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = await context.params

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

    const collaborator = await db.clientCollaborator.findUnique({
      where: { id },
      include: {
        client: true,
      }
    })

    if (!collaborator) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR, // ✅ Changed from NOT_FOUND to VALIDATION_ERROR
          'Collaborator not found',
          404,
          { requestId }
        )
      )
    }

    if (collaborator.status === CollaborationInviteStatus.ACCEPTED) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Collaborator already accepted. Revoke first if you need to re-invite.',
          400,
          { requestId }
        )
      )
    }

    const rate = checkRateLimit(`admin-collab-resend:${collaborator.id}`, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000,
      message: 'Too many resend attempts. Try again later.',
    })
    if (rate) return addCorsHeaders(rate)

    const token = createCollaboratorInviteToken()
    const expiresAt = new Date(Date.now() + COLLABORATOR_INVITE_EXPIRY_MS)

    const updated = await db.clientCollaborator.update({
      where: { id: collaborator.id },
      data: {
        inviteToken: token,
        status: CollaborationInviteStatus.PENDING,
        invitedAt: new Date(),
        expiresAt,
        revokedAt: null,
        acceptedAt: null,
        collaboratorUserId: null,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
          }
        }
      }
    })

    const emailResult = await sendCollaboratorInviteEmail({
      to: collaborator.inviteEmail,
      inviteToken: token,
      clientName: collaborator.client.company || collaborator.client.name,
      inviterName: admin.user.name || 'Admin',
    })

    return addCorsHeaders(
      createSuccessResponse(
        {
          collaborator: updated,
          emailSent: emailResult.success,
          emailError: emailResult.error,
        },
        200,
        { requestId, message: 'Invite resent' }
      )
    )
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/admin/collaborators/[id]',
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to resend invite', 500, {
        requestId,
      })
    )
  }
}