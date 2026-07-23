import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { getVapidPublicKey, isPushConfigured } from "@/lib/push-notifications"

// GET - Get VAPID public key for client-side subscription
export async function GET() {
  const vapidPublicKey = getVapidPublicKey()

  if (!vapidPublicKey) {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 503 }
    )
  }

  return NextResponse.json({
    publicKey: vapidPublicKey,
    configured: isPushConfigured()
  })
}

// POST - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    if (!isPushConfigured()) {
      return NextResponse.json(
        { error: "Push notifications not configured" },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      )
    }

    // Store subscription in PushSubscription model
    // Check if subscription already exists (same endpoint)
    const existing = await db.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint }
    })

    if (existing) {
      // Update existing subscription (user might be re-subscribing from a different device)
      await db.pushSubscription.update({
        where: { id: existing.id },
        data: {
          userId: session.user.id,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: request.headers.get('user-agent'),
          isActive: true,
          updatedAt: new Date()
        }
      })
      console.log(`[Push] User ${session.user.email} updated push subscription (endpoint: ${subscription.endpoint.substring(0, 50)}...)`)
    } else {
      // Create new subscription
      await db.pushSubscription.create({
        data: {
          userId: session.user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: request.headers.get('user-agent'),
          isActive: true
        }
      })
      console.log(`[Push] User ${session.user.email} subscribed to push notifications (endpoint: ${subscription.endpoint.substring(0, 50)}...)`)
    }

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to push notifications"
    })
  } catch (error: any) {
    console.error("[Push] Subscription error:", error)
    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 }
    )
  }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: "Subscription endpoint required" },
        { status: 400 }
      )
    }

    // Remove subscription from database
    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint }
    })

    if (subscription) {
      // Only allow users to unsubscribe their own subscriptions
      if (subscription.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden: Cannot unsubscribe another user's device" },
          { status: 403 }
        )
      }

      // Mark as inactive instead of deleting (for audit trail)
      await db.pushSubscription.update({
        where: { id: subscription.id },
        data: { isActive: false }
      })

      console.log(`[Push] User ${session.user.email} unsubscribed from push notifications (endpoint: ${endpoint.substring(0, 50)}...)`)
    } else {
      console.log(`[Push] Subscription not found for endpoint: ${endpoint.substring(0, 50)}...`)
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed from push notifications"
    })
  } catch (error: any) {
    console.error("[Push] Unsubscribe error:", error)
    return NextResponse.json(
      { error: "Failed to unsubscribe from push notifications" },
      { status: 500 }
    )
  }
}
