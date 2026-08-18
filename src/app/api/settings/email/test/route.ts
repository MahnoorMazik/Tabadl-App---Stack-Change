import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import nodemailer from 'nodemailer'

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
  console.log('📧 Test email API called')

  try {
    const body = await request.json()
    console.log('📧 Request body received:', {
      host: body.host,
      port: body.port,
      username: body.username,
      fromAddress: body.fromAddress,
      testEmail: body.testEmail,
      hasPassword: !!body.password
    })

    const { testEmail, ...emailConfig } = testEmailSchema.parse(body)

    console.log('📧 Creating SMTP transporter with:', {
      host: emailConfig.host,
      port: emailConfig.port,
      username: emailConfig.username,
      encryption: emailConfig.encryption
    })

    // Create transporter
    const secure = emailConfig.encryption === 'ssl'
    
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: secure,
      auth: {
        user: emailConfig.username,
        pass: emailConfig.password,
      },
      tls: {
        servername: emailConfig.tlsServername || emailConfig.host,
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    })

    // Verify connection
    console.log('📧 Verifying SMTP connection...')
    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified successfully')
    } catch (verifyError) {
      console.error('❌ SMTP verification failed:', verifyError)
      return NextResponse.json({
        success: false,
        error: 'SMTP connection failed. Please check your credentials.',
        details: verifyError instanceof Error ? verifyError.message : 'Unknown error'
      }, { status: 400 })
    }

    // Send test email
    const mailOptions = {
      from: `"${emailConfig.fromName}" <${emailConfig.fromAddress}>`,
      to: testEmail,
      subject: 'Test Email from Tabadl Alkon CRM',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #1a1a1a; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Test Email</h2>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            This is a test email from <strong>Tabadl Alkon CRM</strong>.
          </p>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Your email configuration has been set up successfully!
          </p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              <strong>Configuration Details:</strong><br>
              Host: ${emailConfig.host}<br>
              Port: ${emailConfig.port}<br>
              Encryption: ${emailConfig.encryption}<br>
              Username: ${emailConfig.username}<br>
              From: ${emailConfig.fromName} (${emailConfig.fromAddress})
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    }

    console.log('📧 Sending test email to:', testEmail)
    const info = await transporter.sendMail(mailOptions)
    console.log('✅ Test email sent successfully:', info.messageId)

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      response: info.response
    })

  } catch (error) {
    console.error('❌ Test email error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.issues
      }, { status: 400 })
    }

    // Handle specific errors
    let errorMessage = 'Failed to send test email'
    let errorDetails = error instanceof Error ? error.message : 'Unknown error'

    if (error instanceof Error) {
      if (error.message.includes('Invalid login') || error.message.includes('Invalid credentials')) {
        errorMessage = 'Invalid email credentials. Please check your email and app password.'
        errorDetails = 'For Gmail, you need to use an App Password (not your regular password).'
      } else if (error.message.includes('connect') || error.message.includes('connection')) {
        errorMessage = 'Could not connect to SMTP server. Please check host and port.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your SMTP server settings.'
      } else if (error.message.includes('authentication')) {
        errorMessage = 'Authentication failed. Please check your email and password.'
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails
    }, { status: 500 })
  }
})