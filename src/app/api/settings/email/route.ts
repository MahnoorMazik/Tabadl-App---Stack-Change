import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import { db } from '@/lib/db'

const emailConfigSchema = z.object({
  mailDriver: z.string().min(1),
  host: z.string().min(1, 'Host is required'),
  port: z.number().min(1, 'Port is required'),
  username: z.string().email('Valid email is required'),
  password: z.string(), // Allow empty password - will be saved as is
  encryption: z.string(),
  fromAddress: z.string().email('Valid from email is required'),
  fromName: z.string().min(1),
  tlsServername: z.string().optional(),
  allowBusinessEmailConfig: z.boolean(),
  enableNewBusinessEmail: z.boolean(),
  enableNewSubscriptionEmail: z.boolean(),
  enableWelcomeEmail: z.boolean(),
  welcomeEmailSubject: z.string(),
  welcomeEmailBody: z.string(),
  contactEmail: z.union([z.string().email('Valid contact email is required'), z.literal('')]).optional(),
  contactPhone: z.string().optional(),
  businessConsultationRecipients: z.array(z.string().email()).optional(),
  staffWhatsAppNumbers: z.array(z.string()).optional(),
  enableWhatsAppNotifications: z.boolean().optional(),
  whatsappAccessToken: z.string().optional(),
  whatsappApiVersion: z.string().optional(),
  whatsappPhoneNumberId: z.string().optional(),
  whatsappDocumentUrl: z.string().optional()
})

export const GET = withAuth(async (request) => {
  const user = request.user!

  if (user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch from database
    let emailSettings = await db.emailSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    const isConfigured = Boolean(
      emailSettings?.id && emailSettings.host && emailSettings.username && emailSettings.password
    )

    // If no settings exist, return defaults (not yet saved to DB)
    if (!emailSettings) {
      emailSettings = {
        id: '',
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
        businessConsultationRecipients: null,
        staffWhatsAppNumbers: null,
        enableWhatsAppNotifications: true,
        whatsappAccessToken: null,
        whatsappDocumentUrl: null,
        whatsappApiVersion: null,
        whatsappPhoneNumberId: null,
        tlsServername: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }

    if (!emailSettings) {
      return NextResponse.json({ error: 'Email settings not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      isConfigured,
      emailConfig: {
        mailDriver: emailSettings.mailDriver,
        host: emailSettings.host,
        port: emailSettings.port,
        username: emailSettings.username,
        password: emailSettings.password, // Return actual password
        encryption: emailSettings.encryption,
        fromAddress: emailSettings.fromAddress,
        fromName: emailSettings.fromName,
        tlsServername: emailSettings.tlsServername || '',
        allowBusinessEmailConfig: emailSettings.allowBusinessEmailConfig,
        enableNewBusinessEmail: emailSettings.enableNewBusinessEmail,
        enableNewSubscriptionEmail: emailSettings.enableNewSubscriptionEmail,
        enableWelcomeEmail: emailSettings.enableWelcomeEmail,
        welcomeEmailSubject: emailSettings.welcomeEmailSubject || 'Welcome to Tabadl Alkon CRM',
        welcomeEmailBody: emailSettings.welcomeEmailBody || '<p>Welcome to Tabadl Alkon CRM</p>',
        contactEmail: emailSettings.contactEmail || '',
        contactPhone: emailSettings.contactPhone || '',
        businessConsultationRecipients: emailSettings.businessConsultationRecipients ? JSON.parse(emailSettings.businessConsultationRecipients) : [],
        staffWhatsAppNumbers: emailSettings.staffWhatsAppNumbers ? JSON.parse(emailSettings.staffWhatsAppNumbers) : [],
        enableWhatsAppNotifications: emailSettings.enableWhatsAppNotifications ?? true,
        whatsappAccessToken: emailSettings.whatsappAccessToken || '',
        whatsappApiVersion: emailSettings.whatsappApiVersion || '',
        whatsappPhoneNumberId: emailSettings.whatsappPhoneNumberId || '',
        whatsappDocumentUrl: emailSettings.whatsappDocumentUrl || ''
      }
    })
  } catch (error) {
    console.error('Error fetching email config:', error)
    return NextResponse.json({ error: 'Failed to fetch email configuration' }, { status: 500 })
  }
})

export const POST = withAuth(async (request) => {
  const user = request.user!

  if (user.role !== 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const emailConfig = emailConfigSchema.parse(body)

    // Check if settings exist
    const existingSettings = await db.emailSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    // Save to database
    const savedSettings = existingSettings
      ? await db.emailSettings.update({
          where: { id: existingSettings.id },
          data: {
            mailDriver: emailConfig.mailDriver,
            host: emailConfig.host,
            port: emailConfig.port,
            username: emailConfig.username,
            password: emailConfig.password,
            encryption: emailConfig.encryption,
            fromAddress: emailConfig.fromAddress,
            fromName: emailConfig.fromName,
            allowBusinessEmailConfig: emailConfig.allowBusinessEmailConfig,
            tlsServername: emailConfig.tlsServername || null,
            enableNewBusinessEmail: emailConfig.enableNewBusinessEmail,
            enableNewSubscriptionEmail: emailConfig.enableNewSubscriptionEmail,
            enableWelcomeEmail: emailConfig.enableWelcomeEmail,
            welcomeEmailSubject: emailConfig.welcomeEmailSubject,
            welcomeEmailBody: emailConfig.welcomeEmailBody,
            contactEmail: emailConfig.contactEmail || null,
            contactPhone: emailConfig.contactPhone || null,
            businessConsultationRecipients: emailConfig.businessConsultationRecipients ? JSON.stringify(emailConfig.businessConsultationRecipients) : null,
            staffWhatsAppNumbers: emailConfig.staffWhatsAppNumbers ? JSON.stringify(emailConfig.staffWhatsAppNumbers) : null,
            enableWhatsAppNotifications: emailConfig.enableWhatsAppNotifications ?? true,
            whatsappAccessToken: emailConfig.whatsappAccessToken || null,
            whatsappApiVersion: emailConfig.whatsappApiVersion || null,
            whatsappPhoneNumberId: emailConfig.whatsappPhoneNumberId || null,
            whatsappDocumentUrl: emailConfig.whatsappDocumentUrl || null
          }
        })
      : await db.emailSettings.create({
          data: {
            mailDriver: emailConfig.mailDriver,
            host: emailConfig.host,
            port: emailConfig.port,
            username: emailConfig.username,
            password: emailConfig.password,
            encryption: emailConfig.encryption,
            fromAddress: emailConfig.fromAddress,
            fromName: emailConfig.fromName,
            allowBusinessEmailConfig: emailConfig.allowBusinessEmailConfig,
            tlsServername: emailConfig.tlsServername || null,
            enableNewBusinessEmail: emailConfig.enableNewBusinessEmail,
            enableNewSubscriptionEmail: emailConfig.enableNewSubscriptionEmail,
            enableWelcomeEmail: emailConfig.enableWelcomeEmail,
            welcomeEmailSubject: emailConfig.welcomeEmailSubject,
            welcomeEmailBody: emailConfig.welcomeEmailBody,
            contactEmail: emailConfig.contactEmail || null,
            contactPhone: emailConfig.contactPhone || null,
            businessConsultationRecipients: emailConfig.businessConsultationRecipients ? JSON.stringify(emailConfig.businessConsultationRecipients) : null,
            staffWhatsAppNumbers: emailConfig.staffWhatsAppNumbers ? JSON.stringify(emailConfig.staffWhatsAppNumbers) : null,
            enableWhatsAppNotifications: emailConfig.enableWhatsAppNotifications ?? true,
            whatsappAccessToken: emailConfig.whatsappAccessToken || null,
            whatsappApiVersion: emailConfig.whatsappApiVersion || null,
            whatsappPhoneNumberId: emailConfig.whatsappPhoneNumberId || null,
            whatsappDocumentUrl: emailConfig.whatsappDocumentUrl || null
          }
        })

    return NextResponse.json({ 
      message: 'Email configuration saved successfully',
      emailConfig: {
        mailDriver: savedSettings.mailDriver,
        host: savedSettings.host,
        port: savedSettings.port,
        username: savedSettings.username,
        password: savedSettings.password,
        encryption: savedSettings.encryption,
        fromAddress: savedSettings.fromAddress,
        fromName: savedSettings.fromName,
        tlsServername: savedSettings.tlsServername || '',
        allowBusinessEmailConfig: savedSettings.allowBusinessEmailConfig,
        enableNewBusinessEmail: savedSettings.enableNewBusinessEmail,
        enableNewSubscriptionEmail: savedSettings.enableNewSubscriptionEmail,
        enableWelcomeEmail: savedSettings.enableWelcomeEmail,
        welcomeEmailSubject: savedSettings.welcomeEmailSubject || 'Welcome to Tabadl Alkon CRM',
        welcomeEmailBody: savedSettings.welcomeEmailBody || '<p>Welcome to Tabadl Alkon CRM</p>',
        contactEmail: savedSettings.contactEmail || '',
        contactPhone: savedSettings.contactPhone || '',
        businessConsultationRecipients: savedSettings.businessConsultationRecipients ? JSON.parse(savedSettings.businessConsultationRecipients) : [],
        staffWhatsAppNumbers: savedSettings.staffWhatsAppNumbers ? JSON.parse(savedSettings.staffWhatsAppNumbers) : [],
        enableWhatsAppNotifications: savedSettings.enableWhatsAppNotifications ?? true,
        whatsappAccessToken: savedSettings.whatsappAccessToken || '',
        whatsappApiVersion: savedSettings.whatsappApiVersion || '',
        whatsappPhoneNumberId: savedSettings.whatsappPhoneNumberId || '',
        whatsappDocumentUrl: savedSettings.whatsappDocumentUrl || ''
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error saving email config:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    return NextResponse.json({ 
      error: 'Failed to save email configuration',
      details: errorMessage,
      stack: errorStack
    }, { status: 500 })
  }
})