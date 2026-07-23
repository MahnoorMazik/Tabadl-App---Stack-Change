import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { UserRole, ApplicationStatus, DocumentStatus } from '@prisma/client'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

// GET /api/sidebar/stats - Get statistics for sidebar badges
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  try {
    if (user.role === UserRole.CLIENT) {
      // Client statistics
      const client = await db.client.findUnique({
        where: { userId: user.userId },
      })

      if (!client) {
        return addCorsHeaders(createSuccessResponse(
          { stats: {} },
          200,
          { requestId, message: 'No stats available' }
        ))
      }

      const [pendingDocuments, unreadMessages] = await Promise.all([
        db.document.count({
          where: {
            applicationId: {
              in: (await db.application.findMany({
                where: { clientId: client.id },
                select: { id: true }
              })).map(a => a.id)
            },
            status: DocumentStatus.PENDING
          }
        }),
        db.supportMessage.count({
          where: {
            visitorId: user.userId,
            isFromVisitor: false
            // In a real app, you'd track read status
          }
        })
      ])

      return addCorsHeaders(createSuccessResponse({
        stats: {
          pendingDocuments,
          unreadMessages: Math.min(unreadMessages, 99), // Cap at 99 for display
        }
      }, 200, { requestId, message: 'Stats retrieved successfully' }))
    } else if (user.role === UserRole.STAFF) {
      // Admin/Staff statistics
      const [totalApplications, pendingApplications, unreadMessages] = await Promise.all([
        db.application.count(),
        db.application.count({
          where: {
            status: ApplicationStatus.PENDING
          }
        }),
        db.supportMessage.count({
          where: {
            isFromVisitor: true
            // In a real app, you'd track read status per recipient
          }
        })
      ])

      return addCorsHeaders(createSuccessResponse({
        stats: {
          totalApplications,
          pendingApplications,
          unreadMessages: Math.min(unreadMessages, 99), // Cap at 99 for display
        }
      }, 200, { requestId, message: 'Stats retrieved successfully' }))
    }

    return addCorsHeaders(createSuccessResponse(
      { stats: {} },
      200,
      { requestId, message: 'No stats available' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/sidebar/stats',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch stats.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

