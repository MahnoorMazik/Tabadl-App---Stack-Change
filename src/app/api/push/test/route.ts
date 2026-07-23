import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { createNotification } from "@/lib/notifications"
import { isPushConfigured } from "@/lib/push-notifications"

/**
 * POST /api/push/test
 * Sends a test notification to the current user.
 * Creates an in-app notification (shows in bell panel) and sends a push to subscribed devices.
 */
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    if (!isPushConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: "Push notifications are not configured. Run 'pnpm run setup:vapid' and add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to your .env file, then restart the server.",
        },
        { status: 503 }
      )
    }

    const title = "Test Notification"
    const body = "This is a test push notification from TK CRM. If you see this, push notifications are working!"

    // createNotification: adds to in-app panel + sends push to subscribed devices
    await createNotification(session.user.id, title, body)

    return NextResponse.json({
      success: true,
      message: "Test notification sent. Check the bell icon panel and your device notifications.",
    })
  } catch (error) {
    console.error("[Push] Test notification error:", error)
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    )
  }
}
