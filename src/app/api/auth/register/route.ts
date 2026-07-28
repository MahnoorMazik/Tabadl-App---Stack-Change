import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { sendWelcomeEmail } from '@/lib/email'
import { normalizePhone } from '@/lib/phone-normalization'
import { z } from 'zod'
import { UserRole } from '@prisma/client'
import { ensureClientProfileRecords } from '@/lib/business-workflow/profile-completion'
import { renderTemplate, sendWhatsAppTextMessage } from '@/lib/whatsapp'

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  companyName: z.string().optional(),
  phone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 }
      )
    }

    const { name, email, password, companyName, phone } = registerSchema.parse(body)

    // Check if user already exists (only among non-deleted users)
    const existingUser = await db.user.findFirst({
      where: { email, isDeleted: false }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user and client profile in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: UserRole.CLIENT,
        }
      })

      // Generate client number (check ALL clients including deleted ones)
      // clientNumber has @unique constraint, so we need to check ALL clients
      const existingClients = await tx.client.findMany({
        select: { clientNumber: true }
      })
      
      // Extract all numbers and find the maximum
      let maxNumber = 0
      for (const client of existingClients) {
        const match = client.clientNumber.match(/^CT-(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      }
      
      const clientNumber = `CT-${maxNumber + 1}`

      // Create client profile - Client model requires name, email, and userId
      // Normalize phone number if provided
      const normalizedPhoneValue = phone ? normalizePhone(phone) : null
      
      const clientProfile = await tx.client.create({
          data: {
          clientNumber,
          name,
          email,
          phone: normalizedPhoneValue, // Store normalized phone
          company: companyName || null,
            userId: user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          group: true,
        },
        })

      return { user, clientProfile }
    })

    try {
      await ensureClientProfileRecords(result.clientProfile.id)
    } catch (profileError) {
      console.error('Failed to init profile records:', profileError)
    }

    // Send welcome email (non-blocking)
    try {
      const emailSettings = await db.emailSettings.findFirst({
        orderBy: { createdAt: 'desc' }
      })

      // Only send if welcome emails are enabled
      if (emailSettings?.enableWelcomeEmail) {
        await sendWelcomeEmail(result.user.email, result.user.name || name, emailSettings)
      }
    } catch (emailError) {
      // Don't fail registration if email fails
      console.error('Failed to send welcome email:', emailError)
    }

    // Send WhatsApp thank-you message (non-blocking)
    try {
      const normalizedPhoneValue = phone ? normalizePhone(phone) : null
      if (normalizedPhoneValue) {
        const template = process.env.WHATSAPP_WELCOME_TEMPLATE || 'Hello {{name}}, thank you for registering with {{company}}. Your phone number is {{phone}}.'
        const message = renderTemplate(template, {
          name,
          company: companyName || 'our company',
          phone: normalizedPhoneValue,
        })
        await sendWhatsAppTextMessage(normalizedPhoneValue, message)
      }
    } catch (waError) {
      console.error('Failed to send WhatsApp thank-you message:', waError)
    }

    // Return user data - NextAuth will handle the sign-in on the client side
    return NextResponse.json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          clientProfile: result.clientProfile
        },
        // Token is no longer returned - client should use NextAuth signIn after registration
        message: 'Registration successful. Please sign in.'
      }
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      return NextResponse.json(
        { 
          error: firstError?.message || 'Validation failed',
          field: firstError?.path[0] || 'unknown',
          details: error.issues
        },
        { status: 400 }
      )
    }
    
    // Handle Prisma unique constraint errors
    if (error?.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'email'
      return NextResponse.json(
        { 
          error: `${field === 'email' ? 'Email' : 'User'} already exists`,
          field
        },
        { status: 409 }
      )
    }
    
    // Handle Prisma foreign key errors
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference: related record not found' },
        { status: 400 }
      )
    }
    
    // Generic error with more details in development
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Failed to create account. Please try again.'
      : error?.message || 'Internal server error'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV !== 'production' && { details: error })
      },
      { status: 500 }
    )
  }
}