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

    // Save to database
    const savedSettings = existingSettings
      ? await db.emailSettings.update({
          where: { id: existingSettings.id },
          data: {
            businessConsultationRecipients: recipientsData.businessConsultationRecipients ? JSON.stringify(recipientsData.businessConsultationRecipients) : null
          }
        })
      : await db.emailSettings.create({
          data: {
            mailDriver: 'SMTP',
            host: 'mail.tk.sa',
            port: 465,
            username: 'request@tk.sa',
            password: '',
            encryption: 'tls',
            fromAddress: 'request@tk.sa',
            fromName: 'Tabadl Alkon CRM',
            allowBusinessEmailConfig: true,
            enableNewBusinessEmail: true,
            enableNewSubscriptionEmail: true,
            enableWelcomeEmail: true,
            welcomeEmailSubject: 'Welcome to Tabadl Alkon CRM',
            welcomeEmailBody: '<p>Welcome to Tabadl Alkon CRM</p>',
            contactEmail: null,
            contactPhone: null,
            businessConsultationRecipients: recipientsData.businessConsultationRecipients ? JSON.stringify(recipientsData.businessConsultationRecipients) : null
          }
        })

    console.log('Recipients saved:', {
      recipientsCount: recipientsData.businessConsultationRecipients?.length || 0
    })

    return NextResponse.json({ 
      message: 'Business consultation recipients saved successfully',
      recipients: {
        businessConsultationRecipients: recipientsData.businessConsultationRecipients || []
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error saving recipients:', error)
    return NextResponse.json({ error: 'Failed to save recipients' }, { status: 500 })
  }
})
