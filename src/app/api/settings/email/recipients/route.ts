import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import { db } from '@/lib/db'

const recipientsSchema = z.object({
  businessConsultationRecipients: z.array(z.string().email()).optional()
})

export const POST = withAuth(async (request) => {
  const user = request.user!

  if (user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const recipientsData = recipientsSchema.parse(body)

    // Check if settings exist
    const existingSettings = await db.emailSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    let savedSettings

    if (existingSettings) {
      // Update existing settings
      savedSettings = await db.emailSettings.update({
        where: { id: existingSettings.id },
        data: {
          businessConsultationRecipients: recipientsData.businessConsultationRecipients 
            ? JSON.stringify(recipientsData.businessConsultationRecipients) 
            : null
        }
      })
    } else {
      // Create new settings with recipients
      savedSettings = await db.emailSettings.create({
        data: {
          mailDriver: 'SMTP',
          host: '', // Empty - user must configure
          port: 587,
          username: '',
          password: '',
          encryption: 'tls',
          fromAddress: '',
          fromName: 'Tabadl Alkon CRM',
          allowBusinessEmailConfig: true,
          enableNewBusinessEmail: true,
          enableNewSubscriptionEmail: true,
          enableWelcomeEmail: true,
          welcomeEmailSubject: 'Welcome to Tabadl Alkon CRM',
          welcomeEmailBody: '<p>Welcome to Tabadl Alkon CRM</p>',
          contactEmail: null,
          contactPhone: null,
          businessConsultationRecipients: recipientsData.businessConsultationRecipients 
            ? JSON.stringify(recipientsData.businessConsultationRecipients) 
            : null,
          staffWhatsAppNumbers: null,
          enableWhatsAppNotifications: true,
          whatsappAccessToken: null,
          whatsappApiVersion: null,
          whatsappPhoneNumberId: null,
          whatsappDocumentUrl: null,
          tlsServername: null
        }
      })
    }

    // Parse recipients back for response
    const recipients = savedSettings.businessConsultationRecipients 
      ? JSON.parse(savedSettings.businessConsultationRecipients) 
      : []

    console.log('✅ Recipients saved:', {
      recipientsCount: recipients.length
    })

    return NextResponse.json({ 
      success: true,
      message: 'Business consultation recipients saved successfully',
      recipients: {
        businessConsultationRecipients: recipients
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('❌ Error saving recipients:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save recipients' },
      { status: 500 }
    )
  }
})