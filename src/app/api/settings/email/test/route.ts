import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import { sendTestEmailWithFormData } from '@/lib/email'

const testEmailSchema = z.object({
  mailDriver: z.string().min(1),
  host: z.string().min(1, 'Host is required'),
  port: z.number().min(1, 'Port is required'),
  username: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
  encryption: z.string(),
  fromAddress: z.string().email('Valid from address is required'),
  fromName: z.string().min(1, 'From name is required'),
  tlsServername: z.string().optional(),
  testEmail: z.string().email('Valid test email is required')
})

export const POST = withAuth(async (request) => {
  const user = request.user!

  if (user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { testEmail, ...emailConfig } = testEmailSchema.parse(body)


    // Use the new function that accepts form data
    const result = await sendTestEmailWithFormData(
      {
        host: emailConfig.host,
        port: emailConfig.port,
        username: emailConfig.username,
        password: emailConfig.password,
        encryption: emailConfig.encryption,
        fromAddress: emailConfig.fromAddress,
        fromName: emailConfig.fromName,
        tlsServername: (emailConfig as any).tlsServername
      },
      testEmail
    )

    if (result.success) {

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully using form data',
        messageId: result.messageId,
        details: {
          host: emailConfig.host,
          port: emailConfig.port,
          encryption: emailConfig.encryption,
          from: emailConfig.username,
          to: testEmail,
          transportUsed: result.transportUsed,
          response: result.response
        },
        troubleshooting: {
          delivered: true,
          rejected: false,
          tips: [
            '✅ Email was sent successfully using your FORM DATA configuration.',
            'Check your spam/junk folder if not received in inbox.',
            'The robust system automatically tried multiple SMTP configurations.',
            'Your form settings are working correctly!'
          ]
        }
      })
    } else {
      console.error('❌ Test email failed using form data:', result.error)
      
      return NextResponse.json({
        success: false,
        message: 'Test email failed',
        error: result.error,
        troubleshooting: {
          delivered: false,
          rejected: true,
          tips: [
            '❌ Email sending failed using your form configuration.',
            'Check your SMTP configuration settings in the form.',
            'Verify your email credentials are correct.',
            'Try different encryption settings (SSL vs TLS).',
            'The robust system tried multiple transport configurations but all failed.'
          ]
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Email test error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send test email. Please check your configuration.',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
})
