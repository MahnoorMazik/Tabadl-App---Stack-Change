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

async function requireOwnedInvite(request: NextRequest, id: string) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return { error: authResult.error || 'Authentication required', status: authResult.status || 401 }
  }
  if (authResult.user.role !== UserRole.CLIENT) {
    return { error: 'Only clients can manage collaborators', status: 403 }
  }
  const client = await db.client.findFirst({
    where: { userId: authResult.user.userId, isDeleted: false },
    select: { id: true, name: true, company: true },
  })
  if (!client) return { error: 'Client profile not found', status: 404 }

  const invite = await db.clientCollaborator.findFirst({
    where: { id, clientId: client.id },
  })
  if (!invite) return { error: 'Invite not found', status: 404 }

  return { user: authResult.user, client, invite }
}

/** DELETE /api/client/collaborators/[id] — revoke invite or remove collaborator */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = await context.params
    const owned = await requireOwnedInvite(request, id)
    if ('error' in owned) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.AUTHORIZATION_ERROR,
          owned.error || 'Authorization failed',
          owned.status || 403,
          {
          requestId,
        })
      )
    }

    const updated = await db.clientCollaborator.update({
      where: { id: owned.invite.id },
      data: {
        status: CollaborationInviteStatus.REVOKED,
        revokedAt: new Date(),
        collaboratorUserId: null,
        acceptedAt: null,
      },
    })

    return addCorsHeaders(
      createSuccessResponse({ collaborator: updated }, 200, {
        requestId,
        message: 'Collaborator access revoked',
      })
    )
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/client/collaborators/[id]',
      method: 'DELETE',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to revoke collaborator', 500, {
        requestId,
      })
    )
  }
}

/** POST /api/client/collaborators/[id] — resend invite */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const { id } = await context.params
    const owned = await requireOwnedInvite(request, id)
    if ('error' in owned) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.AUTHORIZATION_ERROR,
          owned.error || 'Authorization failed',
          owned.status || 403,
          {
          requestId,
        })
      )
    }

    if (owned.invite.status === CollaborationInviteStatus.ACCEPTED) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Collaborator already accepted. Revoke first if you need to re-invite.',
          400,
          { requestId }
        )
      )
    }

    const rate = checkRateLimit(`collab-resend:${owned.invite.id}`, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000,
      message: 'Too many resend attempts. Try again later.',
    })
    if (rate) return addCorsHeaders(rate)

    const token = createCollaboratorInviteToken()
    const expiresAt = new Date(Date.now() + COLLABORATOR_INVITE_EXPIRY_MS)

    const updated = await db.clientCollaborator.update({
      where: { id: owned.invite.id },
      data: {
        inviteToken: token,
        status: CollaborationInviteStatus.PENDING,
        invitedAt: new Date(),
        expiresAt,
        revokedAt: null,
        acceptedAt: null,
        collaboratorUserId: null,
      },
    })

    const emailResult = await sendCollaboratorInviteEmail({
      to: owned.invite.inviteEmail,
      inviteToken: token,
      clientName: owned.client.company || owned.client.name,
      inviterName: owned.user.name,
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
      endpoint: '/api/client/collaborators/[id]',
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to resend invite', 500, {
        requestId,
      })
    )
  }
}
