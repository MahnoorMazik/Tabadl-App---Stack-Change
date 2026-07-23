import webpush from "web-push"

// Configure VAPID keys for Web Push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

// Initialize web-push with VAPID details
if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@tk.sa",
    vapidPublicKey,
    vapidPrivateKey
  )
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Send a push notification to a single subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload
): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("[Push] VAPID keys not configured")
    return false
  }

  try {
    const notificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.png",
      badge: payload.badge || "/icons/icon-72x72.png",
      data: {
        url: payload.url || "/",
        ...payload.data
      },
      tag: payload.tag
    }

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      },
      JSON.stringify(notificationPayload),
      { TTL: 2419200 }
    )

    console.log(`[Push] Notification sent to ${subscription.endpoint.substring(0, 50)}...`)
    return true
  } catch (error: any) {
    // Handle specific error cases
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`[Push] Subscription expired or invalid: ${subscription.endpoint.substring(0, 50)}...`)
      // The subscription is no longer valid - should be removed from database
      return false
    }

    console.error("[Push] Error sending notification:", error.message)
    return false
  }
}

/**
 * Send push notifications to multiple subscriptions
 * Returns per-index results so callers can identify which subscriptions failed
 */
export async function sendPushNotificationToMany(
  subscriptions: PushSubscription[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number; results: boolean[] }> {
  const results = await Promise.all(
    subscriptions.map(subscription => sendPushNotification(subscription, payload))
  )

  const success = results.filter(Boolean).length
  const failed = results.length - success

  console.log(`[Push] Sent to ${success}/${results.length} subscriptions (${failed} failed)`)

  return { success, failed, results }
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey)
}

/**
 * Get the public VAPID key for client-side subscription
 */
export function getVapidPublicKey(): string | undefined {
  return vapidPublicKey
}

/**
 * Send push notification to a specific user by their ID
 * This ensures notifications only go to devices registered to that user
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("[Push] VAPID keys not configured")
    return { success: 0, failed: 0 }
  }

  try {
    // Import db dynamically to avoid circular dependencies
    const { db } = await import("@/lib/db")
    
    // Get all active push subscriptions for this user
    const subscriptions = await db.pushSubscription.findMany({
      where: {
        userId,
        isActive: true
      }
    })

    if (subscriptions.length === 0) {
      console.log(`[Push] No active subscriptions found for user ${userId}`)
      return { success: 0, failed: 0 }
    }

    console.log(`[Push] Found ${subscriptions.length} subscription(s) for user ${userId}`)

    // Convert database subscriptions to PushSubscription format
    const pushSubscriptions: PushSubscription[] = subscriptions.map(sub => ({
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    }))

    // Send to all subscriptions
    const { results, success, failed } = await sendPushNotificationToMany(pushSubscriptions, payload)

    // Mark only the subscriptions that actually failed (410 = gone, 404 = not found)
    const invalidSubscriptions = subscriptions.filter((_, index) => results[index] === false)

    if (invalidSubscriptions.length > 0) {
      // Mark invalid subscriptions as inactive
      await db.pushSubscription.updateMany({
        where: {
          id: { in: invalidSubscriptions.map(s => s.id) }
        },
        data: {
          isActive: false
        }
      })
      console.log(`[Push] Marked ${invalidSubscriptions.length} invalid subscription(s) as inactive`)
    }

    return { success, failed }
  } catch (error: any) {
    console.error(`[Push] Error sending notification to user ${userId}:`, error)
    return { success: 0, failed: 0 }
  }
}

/**
 * Send push notification to multiple users by their IDs
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number; totalUsers: number }> {
  const results = await Promise.allSettled(
    userIds.map(userId => sendPushNotificationToUser(userId, payload))
  )

  const totalSuccess = results.reduce((sum, result) => {
    if (result.status === "fulfilled") {
      return sum + result.value.success
    }
    return sum
  }, 0)

  const totalFailed = results.reduce((sum, result) => {
    if (result.status === "fulfilled") {
      return sum + result.value.failed
    }
    return sum
  }, 0)

  console.log(`[Push] Sent to ${totalSuccess}/${totalSuccess + totalFailed} subscriptions across ${userIds.length} user(s)`)

  return {
    success: totalSuccess,
    failed: totalFailed,
    totalUsers: userIds.length
  }
}
