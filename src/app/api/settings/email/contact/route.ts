import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import { db } from '@/lib/db'

const contactInfoSchema = z.object({
  contactEmail: z.union([z.string().email('Valid contact email is required'), z.literal('')]).optional(),
  contactPhone: z.string().optional()
})

export const POST = withAuth(async (request) => {
  const user = request.user!

  if (user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const contactInfo = contactInfoSchema.parse(body)

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
          contactEmail: contactInfo.contactEmail || null,
          contactPhone: contactInfo.contactPhone || null
        }
      })
    } else {
      // Create new settings with contact info
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
          contactEmail: contactInfo.contactEmail || null,
          contactPhone: contactInfo.contactPhone || null,
          businessConsultationRecipients: null,
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

    console.log('✅ Contact information saved:', {
      contactEmail: savedSettings.contactEmail,
      contactPhone: savedSettings.contactPhone
    })

    return NextResponse.json({ 
      success: true,
      message: 'Contact information saved successfully',
      contactInfo: {
        contactEmail: savedSettings.contactEmail || '',
        contactPhone: savedSettings.contactPhone || ''
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('❌ Error saving contact info:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save contact information' },
      { status: 500 }
    )
  }
})