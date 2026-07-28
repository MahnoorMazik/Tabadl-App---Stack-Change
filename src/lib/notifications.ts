import { db } from './db'
import { normalizePhone } from './phone-normalization'
import { sendWhatsAppNotificationToUser } from './whatsapp'
import { Server } from 'socket.io'

let io: Server | null = null

export const NOTIFICATION_EVENT_TYPES = ['LEAD_CREATION', 'LEAD_FOLLOWUP', 'CLIENT_CONVERSION', 'REMINDER'] as const
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number]

export function setSocketIO(socketIO: Server) {
  io = socketIO
}

export function getSocketIO(): Server | null {
  return io
}


const DEFAULT_ENABLED_BY_EVENT: Record<NotificationEventType, boolean> = {
  LEAD_CREATION: false,
  LEAD_FOLLOWUP: false,
  CLIENT_CONVERSION: false,
  REMINDER: true,
}

/** Check if the user has enabled notifications for this event type. Missing preference uses default (Reminder=on, others=off). */
export async function shouldSendNotificationForEvent(
  userId: string,
  eventType: NotificationEventType
): Promise<boolean> {
  const pref = await db.notificationPreference.findUnique({
    where: { userId_eventType: { userId, eventType } },
    select: { enabled: true },
  })
  return pref === null ? DEFAULT_ENABLED_BY_EVENT[eventType] : pref.enabled
}

export interface NotificationPushOverrides {
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

export async function createNotification(
  userId: string,
  title: string,
  content: string,
  emitRealtime: boolean = true,
  pushOverrides?: NotificationPushOverrides
) {
  const notification = await db.notification.create({
    data: {
      userId,
      title,
      message: content,
    },
  })

  // Emit real-time notification via Socket.IO
  if (emitRealtime && io) {
    io.to(`user-${userId}`).emit('new-notification', notification)
  }

  // Send push notification to user's subscribed devices
  try {
    const { sendPushNotificationToUser } = await import('@/lib/push-notifications')
    await sendPushNotificationToUser(userId, {
      title,
      body: content,
      url: pushOverrides?.url ?? '/admin/notifications',
      tag: pushOverrides?.tag ?? `notification-${notification.id}`,
      data: { notificationId: notification.id, ...pushOverrides?.data },
    })
  } catch (pushError) {
    console.error('[Notification] Failed to send push:', pushError)
  }

  return notification
}

/** Create in-app + push notification only if the user has enabled this event type. */
export async function createNotificationForEvent(
  userId: string,
  title: string,
  content: string,
  eventType: NotificationEventType,
  emitRealtime: boolean = true,
  pushOverrides?: NotificationPushOverrides
) {
  const allowed = await shouldSendNotificationForEvent(userId, eventType)
  if (!allowed) return null
  return createNotification(userId, title, content, emitRealtime, pushOverrides)
}

export async function notifyTaskAssignment(taskId: string, assignedToId: string, taskTitle: string) {
  await createNotification(
    assignedToId,
    'New Task Assigned',
    `You have been assigned a new task: ${taskTitle}`
  )
}

export async function notifyDocumentReview(documentId: string, uploaderId: string, status: string) {
  const statusText = status === 'APPROVED' ? 'approved' : 'rejected'
  await createNotification(
    uploaderId,
    'Document Review Complete',
    `Your document has been ${statusText}`
  )
  await sendWhatsAppNotificationToUser(
    uploaderId,
    `Your document has been ${statusText}.`
  )
}

export async function notifyInvoiceCreated(clientId: string, invoiceNumber: string) {
  // Get client's user ID
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { userId: true }
  })

  if (client) {
    await createNotification(
      client.userId,
      'New Invoice',
      `Invoice ${invoiceNumber} has been created for your account`
    )
  }
}

export async function notifyPaymentReceived(clientId: string, amount: number) {
  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { userId: true }
  })

  if (client) {
    await createNotification(
      client.userId,
      'Payment Received',
      `Your payment of ${amount} SAR has been received`
    )
  }
}

export async function notifyNewMessage(applicationId: string, senderId: string, messageContent: string) {
  try {
    // Get all users in the application except the sender
    const applicationData = await db.application.findUnique({
      where: { id: applicationId },
      include: {
        client: {
          include: { user: true }
        },
        assignedTo: {
          select: { id: true }
        }
      }
    })

    if (applicationData) {
      // Get user IDs: client user and assigned staff member
      const userIds: string[] = []
      
      if (applicationData.client?.user?.id && applicationData.client.user.id !== senderId) {
        userIds.push(applicationData.client.user.id)
      }
      
      if (applicationData.assignedToId && applicationData.assignedToId !== senderId) {
        userIds.push(applicationData.assignedToId)
      }
      
      // Create notifications for all relevant users
      for (const userId of userIds) {
        await createNotification(
          userId,
          'New Message',
          `New message in application ${applicationData.applicationNumber}: ${messageContent.substring(0, 50)}...`
        )
      }
    }
  } catch (error) {
    // Log error but don't fail message sending
    console.error('Error creating message notifications:', error)
  }
}

