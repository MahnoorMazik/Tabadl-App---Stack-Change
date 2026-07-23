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

const noteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
  body: z.string().trim().min(1, 'Body is required')
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

    const notes = await db.leadNote.findMany({
      where: { leadId: id },
      orderBy: { createdAt: 'desc' },
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
      { notes },
      200,
      { requestId, message: 'Notes retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: '/api/leads/[id]/notes',
      method: 'GET',
      additionalContext: { errorType: error?.constructor?.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch notes.',
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

    const payload = await request.json()
    const data = noteSchema.parse(payload)

    const note = await db.leadNote.create({
      data: {
        title: data.title.trim(),
        body: data.body.trim(),
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
        }
      }
    })

    return addCorsHeaders(createSuccessResponse(
      { note },
      201,
      { requestId, message: 'Note added successfully' }
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
      endpoint: '/api/leads/[id]/notes',
      method: 'POST',
      additionalContext: { errorType: error?.constructor?.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to add note.',
      500,
      { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
    ))
  }
}

