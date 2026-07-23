import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  getErrorSuggestion,
  getRequestId,
  logError
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

const followUpSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().trim().optional(),
  scheduledAt: z.string().datetime('Invalid date format')
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    
    // Check if user has permission to manage leads
    // Staff users should have leads.manage permission, but check permissions array first
    const hasPermission = user.permissions?.includes('leads.manage') || 
                         user.role === 'STAFF' || 
                         user.role === 'ADMIN'
    
    if (!hasPermission) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.AUTHORIZATION_ERROR,
        'Forbidden: You do not have permission to manage leads',
        403,
        { 
          requestId, 
          suggestion: getErrorSuggestion(ErrorCodes.AUTHORIZATION_ERROR),
          context: {
            role: user.role,
            permissions: user.permissions || [],
            hasLeadsManage: user.permissions?.includes('leads.manage')
          }
        }
      ))
    }

    const { id } = await params
    if (!id) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Lead ID is required.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    const lead = await db.lead.findFirst({
      where: { id, isDeleted: false },
      select: { id: true }
    })

    if (!lead) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Lead not found.',
        404,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
      ))
    }

    const followUps = await db.leadFollowUp.findMany({
      where: { leadId: id },
      orderBy: { scheduledAt: 'asc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return addCorsHeaders(createSuccessResponse(
      { followUps },
      200,
      { requestId, message: 'Follow-ups retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: '/api/leads/[id]/follow-ups',
      method: 'GET',
      additionalContext: { errorType: error?.constructor?.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch follow-ups.',
      500,
      { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
    ))
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    
    // Check if user has permission to manage leads
    // Staff users should have leads.manage permission, but check permissions array first
    const hasPermission = user.permissions?.includes('leads.manage') || 
                         user.role === 'STAFF' || 
                         user.role === 'ADMIN'
    
    if (!hasPermission) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.AUTHORIZATION_ERROR,
        'Forbidden: You do not have permission to manage leads',
        403,
        { 
          requestId, 
          suggestion: getErrorSuggestion(ErrorCodes.AUTHORIZATION_ERROR),
          context: {
            role: user.role,
            permissions: user.permissions || [],
            hasLeadsManage: user.permissions?.includes('leads.manage')
          }
        }
      ))
    }

    const { id } = await params
    if (!id) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Lead ID is required.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    const payload = await request.json()
    const data = followUpSchema.parse(payload)

    // Get lead details to determine who should receive the notification
    const lead = await db.lead.findFirst({
      where: { id, isDeleted: false },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!lead) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Lead not found.',
        404,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
      ))
    }

    const followUp = await db.leadFollowUp.create({
      data: {
        title: data.title.trim(),
        description: (data.description ?? '').trim(),
        scheduledAt: new Date(data.scheduledAt),
        leadId: id,
        createdById: user.userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lead: {
          select: {
            id: true,
            leadNumber: true,
            fullName: true
          }
        }
      }
    })

    const { createNotificationForEvent } = await import('@/lib/notifications')
    const title = 'New Follow-up Scheduled'
    const body = `Follow-up scheduled for lead: ${lead.fullName} (${lead.leadNumber}) - ${followUp.title}`
    const pushOverrides = {
      url: `/admin/leads/${lead.id}`,
      tag: `followup-${followUp.id}`,
      data: {
        leadId: lead.id,
        followUpId: followUp.id,
        scheduledAt: followUp.scheduledAt.toISOString(),
        type: 'lead_followup'
      }
    }

    const notificationUserId = lead.assignedToId || lead.createdById
    const userIdsToNotify = new Set<string>([user.userId])
    if (notificationUserId) userIdsToNotify.add(notificationUserId)

    for (const uid of userIdsToNotify) {
      try {
        await createNotificationForEvent(uid, title, body, 'LEAD_FOLLOWUP', true, pushOverrides)
      } catch (pushError) {
        console.error('[Notification] Failed to send follow-up notification to user:', uid, pushError)
      }
    }

    return addCorsHeaders(createSuccessResponse(
      { followUp },
      201,
      { requestId, message: 'Follow-up scheduled successfully' }
    ))
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))

      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        { requestId, details, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: '/api/leads/[id]/follow-ups',
      method: 'POST',
      additionalContext: { errorType: error?.constructor?.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to schedule follow-up.',
      500,
      { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
    ))
  }
}
