import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/rbac-middleware"
import type { AuthenticatedRequest } from "@/lib/rbac-middleware"
import {
  createErrorResponse,
  createSuccessResponse,
  getRequestId,
  logError,
  ErrorCodes,
  getErrorSuggestion,
} from "@/lib/error-handler"
import { addCorsHeaders } from "@/lib/cors"

function getIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/")
  return segments[segments.length - 1] || null
}

// PATCH /api/notifications/[id] - Update single notification (isRead, isPinned)
export const PATCH = withAuth(async (request: AuthenticatedRequest) => {
  const requestId = getRequestId(request)
  const user = request.user!
  const id = getIdFromPath(new URL(request.url).pathname)

  try {
    const body = await request.json()
    const { isRead, isPinned } = body

    const updateData: { isRead?: boolean; isPinned?: boolean } = {}
    if (typeof isRead === "boolean") updateData.isRead = isRead
    if (typeof isPinned === "boolean") updateData.isPinned = isPinned

    if (!id) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Notification ID required", 400, {
          requestId,
        })
      )
    }

    if (Object.keys(updateData).length === 0) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          "No valid fields to update",
          400,
          { requestId }
        )
      )
    }

    const notification = await db.notification.updateMany({
      where: { id, userId: user.userId, isDeleted: false },
      data: updateData,
    })

    if (notification.count === 0) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, "Notification not found", 404, {
          requestId,
        })
      )
    }

    return addCorsHeaders(
      createSuccessResponse({ success: true }, 200, {
        requestId,
        message: "Notification updated",
      })
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: "/api/notifications/[id]",
      method: "PATCH",
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        "Failed to update notification",
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
})

// DELETE /api/notifications/[id] - Soft delete notification
export const DELETE = withAuth(async (request: AuthenticatedRequest) => {
  const requestId = getRequestId(request)
  const user = request.user!
  const id = getIdFromPath(new URL(request.url).pathname)

  try {
    if (!id) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, "Notification ID required", 400, {
          requestId,
        })
      )
    }

    const notification = await db.notification.updateMany({
      where: { id, userId: user.userId },
      data: { isDeleted: true, deletedAt: new Date() },
    })

    if (notification.count === 0) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, "Notification not found", 404, {
          requestId,
        })
      )
    }

    const unreadCount = await db.notification.count({
      where: {
        userId: user.userId,
        isRead: false,
        isDeleted: false,
      },
    })

    return addCorsHeaders(
      createSuccessResponse({ success: true, unreadCount }, 200, {
        requestId,
        message: "Notification removed",
      })
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: "/api/notifications/[id]",
      method: "DELETE",
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        "Failed to remove notification",
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
})
