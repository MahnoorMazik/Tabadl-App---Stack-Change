import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

// GET /api/notifications - Get user's notifications
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!
  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unreadOnly') === 'true'
  const pinnedOnly = searchParams.get('pinnedOnly') === 'true'

  // Do NOT run processFollowUpReminders here: it caused duplicate notifications when
  // multiple users/tabs called GET /api/notifications. Use cron (GET /api/cron/follow-up-reminders) only.

  try {
    const where: any = { userId: user.userId, isDeleted: false }
    if (unreadOnly) where.isRead = false
    if (pinnedOnly) where.isPinned = true

    const notifications = await db.notification.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 100, // Limit to last 100 notifications for history
    })

    const unreadCount = await db.notification.count({
      where: {
        userId: user.userId,
        isRead: false,
        isDeleted: false,
      },
    })

    // Map message → content for frontend compatibility
    const notificationsWithContent = notifications.map((n) => ({
      ...n,
      content: n.message,
    }))

    return addCorsHeaders(createSuccessResponse(
      { notifications: notificationsWithContent, unreadCount },
      200,
      { requestId, message: 'Notifications retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/notifications',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch notifications.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

// POST /api/notifications - Mark notifications as read, pin/unpin, or remove all
export const POST = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  try {
    const body = await request.json()
    const { notificationIds, markAllAsRead, removeAll } = body

    const { pinIds, unpinIds } = body

    // Remove all notifications (soft delete)
    if (removeAll) {
      await db.notification.updateMany({
        where: {
          userId: user.userId,
          isDeleted: false,
        },
        data: { isDeleted: true, deletedAt: new Date() },
      })
    }

    if (markAllAsRead) {
      await db.notification.updateMany({
        where: {
          userId: user.userId,
          isRead: false,
          isDeleted: false,
        },
        data: { isRead: true },
      })
    }
    if (notificationIds && Array.isArray(notificationIds)) {
      await db.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: user.userId,
          isDeleted: false,
        },
        data: { isRead: true },
      })
    }
    if (pinIds && Array.isArray(pinIds) && pinIds.length > 0) {
      await db.notification.updateMany({
        where: { id: { in: pinIds }, userId: user.userId, isDeleted: false },
        data: { isPinned: true },
      })
    }
    if (unpinIds && Array.isArray(unpinIds) && unpinIds.length > 0) {
      await db.notification.updateMany({
        where: { id: { in: unpinIds }, userId: user.userId, isDeleted: false },
        data: { isPinned: false },
      })
    }

    // Return updated unread count for immediate UI sync
    const unreadCount = await db.notification.count({
      where: {
        userId: user.userId,
        isRead: false,
        isDeleted: false,
      },
    })

    return addCorsHeaders(createSuccessResponse(
      { success: true, unreadCount },
      200,
      { requestId, message: 'Notifications updated successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/notifications',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to update notifications.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

