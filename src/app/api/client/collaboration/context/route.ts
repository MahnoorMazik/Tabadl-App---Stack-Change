import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  getRequestId,
} from '@/lib/error-handler'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'
import { requireAuth } from '@/lib/rbac-middleware'
import { getAcceptedCollaborationForUser } from '@/lib/collaboration'

export const OPTIONS = () => handleCorsPreflight()

/** GET /api/client/collaboration/context — who am I acting for (collaborator) or my client */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.AUTHENTICATION_ERROR,
        authResult.error || 'Authentication required',
        authResult.status || 401,
        { requestId }
      )
    )
  }

  if (authResult.user.role === UserRole.COLLABORATOR) {
    const link = await getAcceptedCollaborationForUser(authResult.user.userId)
    if (!link) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.AUTHORIZATION_ERROR,
          'No accepted collaboration found',
          403,
          { requestId }
        )
      )
    }
    return addCorsHeaders(
      createSuccessResponse(
        {
          role: 'COLLABORATOR',
          actingOnBehalfOf: link.client,
          collaborationId: link.id,
        },
        200,
        { requestId }
      )
    )
  }

  if (authResult.user.role === UserRole.CLIENT) {
    const client = await db.client.findFirst({
      where: { userId: authResult.user.userId, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        clientNumber: true,
      },
    })
    return addCorsHeaders(
      createSuccessResponse(
        {
          role: 'CLIENT',
          client,
        },
        200,
        { requestId }
      )
    )
  }

  return addCorsHeaders(
    createErrorResponse(ErrorCodes.AUTHORIZATION_ERROR, 'Forbidden', 403, { requestId })
  )
}
