import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { UserRole, StaffType } from '@prisma/client'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  try {
    let tasks

    if (user.role === UserRole.STAFF && user.staffType === StaffType.ADMIN) {
      // Admins can see all tasks
      tasks = await db.task.findMany({
        include: {
          application: {
            include: {
              client: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ]
      })
    } else if (user.role === UserRole.STAFF) {
      // Non-admin staff can see tasks assigned to them
      tasks = await db.task.findMany({
        where: { assignedToId: user.userId },
        include: {
          application: {
            include: {
              client: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' }
        ]
      })
    } else {
      // Clients shouldn't access this endpoint
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.AUTHORIZATION_ERROR,
        'Insufficient permissions. Staff access required.',
        403,
        { requestId }
      ))
    }

    return addCorsHeaders(createSuccessResponse(
      { tasks },
      200,
      { requestId, message: 'Assigned tasks retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/tasks/assigned',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch assigned tasks.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})
