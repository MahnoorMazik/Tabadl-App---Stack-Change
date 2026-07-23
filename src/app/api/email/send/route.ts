import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac-middleware'
import { sendEmail, sendNotificationEmail } from '@/lib/email'
import { z } from 'zod'

const sendEmailSchema = z.object({
  to: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  text: z.string().optional(),
  html: z.string().optional(),
  type: z.enum(['custom', 'notification']).default('custom'),
  notificationData: z.object({
    title: z.string().optional(),
    message: z.string().optional(),
    actionUrl: z.string().optional(),
  }).optional()
})

export const POST = withAuth(async (request) => {
  const user = request.user!

  // Only staff can send emails
  if (user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validated = sendEmailSchema.parse(body)

    if (validated.type === 'notification' && validated.notificationData) {
      const { title, message, actionUrl } = validated.notificationData
      
      if (!title || !message) {
        return NextResponse.json(
          { error: 'Title and message are required for notification emails' },
          { status: 400 }
        )
      }

      const result = await sendNotificationEmail(
        validated.to,
        title,
        message,
        actionUrl
      )

      return NextResponse.json({
        success: true,
        message: 'Notification email sent successfully',
        messageId: result.messageId
      })
    } else {
      // Custom email
      if (!validated.html && !validated.text) {
        return NextResponse.json(
          { error: 'Either text or html content is required' },
          { status: 400 }
        )
      }

      const result = await sendEmail({
        to: validated.to,
        subject: validated.subject,
        text: validated.text,
        html: validated.html
      })

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId
      })
    }
  } catch (error) {
    console.error('Error sending email:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
})
