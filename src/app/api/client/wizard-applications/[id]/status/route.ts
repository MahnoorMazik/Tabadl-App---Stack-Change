import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth/config'
import { sendApplicationStatusEmail } from '@/lib/email/application-email-service'
import { sendApplicationStatusWhatsApp } from '@/lib/whatsapp/application-whatsapp'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { answers, wizardStepId } = body

    // Get application with client details
    const application = await db.wizardApplication.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          }
        },
        wizard: {
          select: {
            name: true,
            areaOfInterest: true,
          }
        }
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // ✅ Check if already submitted
    if (application.status !== 'DRAFT' && application.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Application already submitted' },
        { status: 400 }
      )
    }

    // Update application status to PENDING
    const updatedApp = await db.wizardApplication.update({
      where: { id },
      data: {
        status: 'PENDING',
        submittedAt: new Date(),
        updatedAt: new Date(),
        // Save answers logic...
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          }
        },
        wizard: {
          select: {
            name: true,
            areaOfInterest: true,
          }
        }
      }
    })

    console.log('✅ Application submitted:', updatedApp.applicationNumber)

    // 📧 SEND EMAIL NOTIFICATION
    let emailResult = { success: false, error: 'No email sent' }
    
    if (updatedApp.client?.email) {
      try {
        console.log('📧 Sending email to:', updatedApp.client.email)
        
        const result = await sendApplicationStatusEmail({
          applicationId: updatedApp.id,
          applicationNumber: updatedApp.applicationNumber,
          status: 'SUBMITTED',
          recipientEmail: updatedApp.client.email,
          serviceName: updatedApp.areaOfInterest || updatedApp.wizard?.name,
          adminNotes: 'Your application has been submitted successfully. Our team will review it shortly.',
        })
        
        emailResult = {
          success: result.success,
          error: result.error || 'Unknown error',
        }
        
        console.log('✅ Email result:', emailResult)
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError)
        emailResult = {
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        }
      }
    }

    // 📱 SEND WHATSAPP NOTIFICATION - 🔥 THIS IS THE FIX!
    let whatsappResult = { success: false, error: 'No WhatsApp sent' }
    
    if (updatedApp.client?.phone) {
      try {
        console.log('📱 Sending WhatsApp notification for submission')
        console.log('📱 Recipient:', updatedApp.client.phone)
        console.log('📱 Application:', updatedApp.applicationNumber)
        
        const result = await sendApplicationStatusWhatsApp({
          applicationId: updatedApp.id,
          applicationNumber: updatedApp.applicationNumber,
          status: 'SUBMITTED',
          recipientPhone: updatedApp.client.phone,
          serviceName: updatedApp.areaOfInterest || updatedApp.wizard?.name,
          adminNotes: 'Your application has been submitted successfully. Our team will review it shortly.',
        })
        
        whatsappResult = {
          success: result.success,
          error: result.error || 'Unknown error',
        }
        
        if (result.success) {
          console.log('✅ WhatsApp notification sent successfully!')
        } else {
          console.log('❌ WhatsApp failed:', result.error)
        }
      } catch (whatsappError) {
        console.error('❌ Failed to send WhatsApp:', whatsappError)
        whatsappResult = {
          success: false,
          error: whatsappError instanceof Error ? whatsappError.message : 'Unknown error',
        }
      }
    } else {
      console.log('⚠️ No phone number found for client, skipping WhatsApp')
    }

    return NextResponse.json({
      success: true,
      data: {
        application: updatedApp,
        emailSent: emailResult.success,
        emailError: emailResult.error,
        whatsappSent: whatsappResult.success,
        whatsappError: whatsappResult.error,
      },
      message: `Application submitted. ${emailResult.success ? '📧 Email sent' : '📧 Email failed'} | ${whatsappResult.success ? '📱 WhatsApp sent' : '📱 WhatsApp failed'}`
    })

  } catch (error) {
    console.error('❌ Submission error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit application' },
      { status: 500 }
    )
  }
}