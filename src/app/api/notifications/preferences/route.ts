import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { createSuccessResponse, createErrorResponse, getRequestId, logError, ErrorCodes, getErrorSuggestion } from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'
import { NOTIFICATION_EVENT_TYPES, type NotificationEventType } from '@/lib/notifications'
import { z } from 'zod'

const DEFAULT_ENABLED_BY_EVENT: Record<NotificationEventType, boolean> = {
  LEAD_CREATION: false,
  LEAD_FOLLOWUP: false,
  CLIENT_CONVERSION: false,
  REMINDER: true,
}

const DEFAULT_REMINDER_MINUTES = 15
const MIN_REMINDER_MINUTES = 15 // Align with cron (runs every 15 min); shorter windows are unreliable
const MAX_REMINDER_MINUTES = 60 * 24 * 7 // 1 week

const putSchema = z.object({
  preferences: z.array(
    z.object({
      eventType: z.enum(NOTIFICATION_EVENT_TYPES),
      enabled: z.boolean(),
    })
  ),
  reminderMinutesBefore: z.number().int().min(MIN_REMINDER_MINUTES).max(MAX_REMINDER_MINUTES).optional(),
})

// GET /api/notifications/preferences - Get current user's notification event preferences
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  try {
    const [prefRows, settings] = await Promise.all([
      db.notificationPreference.findMany({
        where: { userId: user.userId },
        select: { eventType: true, enabled: true },
      }),
      db.notificationSettings.findUnique({
        where: { userId: user.userId },
        select: { reminderMinutesBefore: true },
      }),
    ])

    const byType = new Map(prefRows.map((r) => [r.eventType, r.enabled]))
    const preferences = NOTIFICATION_EVENT_TYPES.map((eventType) => ({
      eventType,
      enabled: byType.has(eventType) ? byType.get(eventType)! : DEFAULT_ENABLED_BY_EVENT[eventType],
    }))
    const raw = settings?.reminderMinutesBefore ?? DEFAULT_REMINDER_MINUTES
    const reminderMinutesBefore = Math.max(MIN_REMINDER_MINUTES, raw)

    const response = addCorsHeaders(createSuccessResponse({ preferences, reminderMinutesBefore }, 200, { requestId }))
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (error: any) {
    logError(error, { code: ErrorCodes.DATABASE_ERROR, requestId, userId: user.userId })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch notification preferences.', 500, { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) })
    )
  }
})

// PUT /api/notifications/preferences - Update current user's notification event preferences
export const PUT = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  try {
    const body = await request.json()
    const { preferences, reminderMinutesBefore } = putSchema.parse(body)

    await db.$transaction(async (tx) => {
      for (const { eventType, enabled } of preferences) {
        await tx.notificationPreference.upsert({
          where: {
            userId_eventType: { userId: user.userId, eventType },
          },
          create: { userId: user.userId, eventType, enabled },
          update: { enabled },
        })
      }
      if (reminderMinutesBefore !== undefined) {
        await tx.notificationSettings.upsert({
          where: { userId: user.userId },
          create: { userId: user.userId, reminderMinutesBefore },
          update: { reminderMinutesBefore },
        })
      }
    })

    const [rows, settings] = await Promise.all([
      db.notificationPreference.findMany({
        where: { userId: user.userId },
        select: { eventType: true, enabled: true },
      }),
      db.notificationSettings.findUnique({
        where: { userId: user.userId },
        select: { reminderMinutesBefore: true },
      }),
    ])
    const byType = new Map(rows.map((r) => [r.eventType, r.enabled]))
    const resultPrefs = NOTIFICATION_EVENT_TYPES.map((eventType) => ({
      eventType,
      enabled: byType.has(eventType) ? byType.get(eventType)! : DEFAULT_ENABLED_BY_EVENT[eventType],
    }))
    const rawReminder = settings?.reminderMinutesBefore ?? DEFAULT_REMINDER_MINUTES
    const resultReminder = Math.max(MIN_REMINDER_MINUTES, rawReminder)

    return addCorsHeaders(createSuccessResponse({ preferences: resultPrefs, reminderMinutesBefore: resultReminder }, 200, { requestId }))
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid preferences.', 400, { requestId, details: error.issues })
      )
    }
    logError(error, { code: ErrorCodes.DATABASE_ERROR, requestId, userId: user.userId })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to update notification preferences.', 500, { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) })
    )
  }
})
