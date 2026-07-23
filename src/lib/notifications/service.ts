import { db } from '@/lib/db'
import { sendNotificationEmail } from '@/lib/email'
import { getEventDefault } from '@/lib/notifications/event-registry'
import { createNotification, getSocketIO } from '@/lib/notifications'
import { sendPushNotificationToUser } from '@/lib/push-notifications'
import { MAIN_ROLE_NAMES } from '@/lib/rbac'

function appBaseUrl(): string {
  const raw =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://tk.sa'
  return raw.replace(/\/$/, '')
}

function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${appBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

export interface DispatchEventOptions {
  eventType: string
  title: string
  message: string
  entityType?: string
  entityId?: string
  assignedUserId?: string | null
  overrideUserIds?: string[]
  url?: string
}

async function resolveSetting(eventType: string) {
  const row = await db.notificationEventSetting.findUnique({ where: { eventType } })
  if (row) return row
  const def = getEventDefault(eventType)
  return {
    eventType,
    sendEmail: def.defaultEmail,
    sendInApp: def.defaultInApp,
    sendPush: def.defaultPush,
    recipients: def.defaultRecipients,
  }
}

async function getAdminUserIds(excludeUserId?: string): Promise<string[]> {
  const admins = await db.user.findMany({
    where: {
      isDeleted: false,
      isActive: true,
      role: 'STAFF',
      customRole: { name: MAIN_ROLE_NAMES.ADMIN },
    },
    select: { id: true },
  })
  return admins.map((a) => a.id).filter((id) => id !== excludeUserId)
}

async function notifyOneUser(
  userId: string,
  opts: {
    eventType: string
    title: string
    message: string
    entityType?: string
    entityId?: string
    url: string
    sendEmail: boolean
    sendInApp: boolean
    sendPush: boolean
  }
) {
  const { eventType, title, message, entityType, entityId, url, sendEmail, sendInApp, sendPush } = opts

  if (sendInApp) {
    const notification = await db.notification.create({
      data: {
        userId,
        title,
        message,
        type: eventType,
        entityType,
        entityId,
      },
    })

    const io = getSocketIO()
    if (io) {
      io.to(`user-${userId}`).emit('new-notification', notification)
    }
  }

  if (sendPush) {
    await sendPushNotificationToUser(userId, {
      title,
      body: message,
      url,
      tag: `event-${eventType}-${entityId ?? userId}`,
      data: { eventType, entityType, entityId },
    }).catch((e) => console.error('[dispatchEvent] push failed:', e))
  }

  if (sendEmail) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } })
    if (user?.email) {
      await sendNotificationEmail(user.email, title, message, absoluteUrl(url)).catch((e) =>
        console.error('[dispatchEvent] email failed:', e)
      )
    }
  }
}

/**
 * Dispatches a notification respecting global event settings (email, in-app, push, recipients).
 */
export async function dispatchEvent(opts: DispatchEventOptions) {
  const { eventType, title, message, entityType, entityId, assignedUserId, overrideUserIds, url } = opts
  const notifyUrl = url ?? '/admin/notifications'
  const setting = await resolveSetting(eventType)

  if (overrideUserIds?.length) {
    for (const userId of overrideUserIds) {
      await notifyOneUser(userId, {
        eventType,
        title,
        message,
        entityType,
        entityId,
        url: notifyUrl,
        sendEmail: setting.sendEmail,
        sendInApp: setting.sendInApp,
        sendPush: setting.sendPush,
      })
    }
    return
  }

  const userIds: string[] = []
  if (assignedUserId && (setting.recipients === 'assigned' || setting.recipients === 'both')) {
    userIds.push(assignedUserId)
  }
  if (setting.recipients === 'all_admins' || setting.recipients === 'both') {
    const adminIds = await getAdminUserIds(assignedUserId ?? undefined)
    userIds.push(...adminIds)
  }

  const unique = [...new Set(userIds)]
  for (const userId of unique) {
    await notifyOneUser(userId, {
      eventType,
      title,
      message,
      entityType,
      entityId,
      url: notifyUrl,
      sendEmail: setting.sendEmail,
      sendInApp: setting.sendInApp,
      sendPush: setting.sendPush,
    })
  }
}

/** Backward-compatible helper for simple in-app notifications. */
export { createNotification }
