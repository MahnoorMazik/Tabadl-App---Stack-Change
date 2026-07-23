import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  getErrorSuggestion,
  getRequestId,
  logError
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; followUpId: string }> }
) {
  const requestId = getRequestId(request)
  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.AUTHENTICATION_ERROR,
        authResult.error || 'Unauthorized',
        authResult.status,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.AUTHENTICATION_ERROR) }
      ))
    }

    const { user } = authResult
    const hasPermission = user.permissions?.includes('leads.manage') || user.role === 'STAFF' || user.role === 'ADMIN'
    if (!hasPermission) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.AUTHORIZATION_ERROR,
        'Forbidden: You do not have permission to manage leads',
        403,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.AUTHORIZATION_ERROR) }
      ))
    }

    const { id: leadId, followUpId } = await params
    if (!leadId || !followUpId) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Lead ID and follow-up ID are required.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    const followUp = await db.leadFollowUp.findFirst({
      where: { id: followUpId, leadId },
      select: { id: true }
    })

    if (!followUp) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Follow-up not found.',
        404,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
      ))
    }

    await db.leadFollowUp.delete({
      where: { id: followUpId }
    })

    return addCorsHeaders(createSuccessResponse(
      { deleted: true },
      200,
      { requestId, message: 'Follow-up cancelled.' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: '/api/leads/[id]/follow-ups/[followUpId]',
      method: 'DELETE',
      additionalContext: { errorType: error?.constructor?.name }
    })
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to cancel follow-up.',
      500,
      { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
    ))
  }
}
