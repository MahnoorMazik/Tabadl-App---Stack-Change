import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { ApplicationStatus, UserRole } from '@prisma/client'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'
import { requireAuth } from '@/lib/rbac-middleware'

// GET /api/client-applications/[id] - Get specific client application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  const authResult = await requireAuth(request)
  
  if ('error' in authResult) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHENTICATION_ERROR,
      authResult.error || 'Authentication failed',
      authResult.status || 401,
      { requestId }
    ))
  }

  const { user } = authResult
  const paramsResolved = await params
  const id = paramsResolved.id
  
  if (!id) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Application ID is required',
      400,
      { requestId }
    ))
  }

  try {
    const application = await db.application.findUnique({
      where: { id: id as string },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        documents: {
          select: {
            id: true,
            filename: true,
            status: true,
            createdAt: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!application) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Application not found.',
        404,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
      ))
    }

    // Check if user has access to this application
    if (user.role === UserRole.CLIENT) {
      const client = await db.client.findUnique({
        where: { userId: user.userId }
      })
      
      if (!client || application.clientId !== client.id) {
        return addCorsHeaders(createErrorResponse(
          ErrorCodes.AUTHORIZATION_ERROR,
          'Access denied to this application.',
          403,
          { requestId }
        ))
      }
    }

    return addCorsHeaders(createSuccessResponse(
      { application },
      200,
      { requestId, message: 'Application retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/client-applications/[id]',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch application.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
}

// PUT /api/client-applications/[id] - Update client application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  const authResult = await requireAuth(request)
  
  if ('error' in authResult) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHENTICATION_ERROR,
      authResult.error || 'Authentication failed',
      authResult.status || 401,
      { requestId }
    ))
  }

  const { user } = authResult
  const paramsResolved = await params
  const id = paramsResolved.id
  
  if (!id) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Application ID is required',
      400,
      { requestId }
    ))
  }

  try {
    const body = await request.json()
    const { status, description, assignedToId } = body

    const updateData: any = {}
    if (status) updateData.status = status as ApplicationStatus
    if (description !== undefined) updateData.description = description
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null

    const application = await db.application.update({
      where: { id: id as string },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return addCorsHeaders(createSuccessResponse(
      { application },
      200,
      { requestId, message: 'Application updated successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/client-applications/[id]',
      method: 'PUT',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to update application.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
}

// DELETE /api/client-applications/[id] - Delete client application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  const authResult = await requireAuth(request)
  
  if ('error' in authResult) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHENTICATION_ERROR,
      authResult.error || 'Authentication failed',
      authResult.status || 401,
      { requestId }
    ))
  }

  const { user } = authResult
  const paramsResolved = await params
  const id = paramsResolved.id
  
  if (!id) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Application ID is required',
      400,
      { requestId }
    ))
  }

  try {
    // Check if user has permission to delete
    if (user.role !== UserRole.STAFF || user.staffType !== 'ADMIN') {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.AUTHORIZATION_ERROR,
        'Access denied. Admin role required.',
        403,
        { requestId }
      ))
    }

    // Soft delete application (mark as deleted, keep ID and data)
    await db.application.update({
      where: { id: id as string },
      data: { isDeleted: true, deletedAt: new Date() }
    })

    // Also soft delete related documents and tasks
    await db.document.updateMany({
      where: { applicationId: id as string, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() }
    })
    
    await db.task.updateMany({
      where: { applicationId: id as string, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() }
    })

    return addCorsHeaders(createSuccessResponse(
      { message: 'Application deleted successfully' },
      200,
      { requestId }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/client-applications/[id]',
      method: 'DELETE',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to delete application.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
}

