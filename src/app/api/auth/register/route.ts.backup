import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { sendEmailVerificationEmail } from '@/lib/email'
import { normalizePhone } from '@/lib/phone-normalization'
import { z } from 'zod'
import { UserRole } from '@prisma/client'
import { ensureClientProfileRecords } from '@/lib/business-workflow/profile-completion'
import crypto from 'crypto'

import { encodeBilingualText } from '@/lib/multilingual-text'

const registerSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional(),
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
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 }
      )
    }

    const { name, nameAr, email, password, companyName, phone } = registerSchema.parse(body)

    // Store plain full name string
    const finalName = name.trim()

    const existingUser = await db.user.findFirst({
      where: { email, isDeleted: false }
    })

    if (existingUser) {
      if (!existingUser.emailVerified && existingUser.role === UserRole.CLIENT) {
        return NextResponse.json(
          {
            error: 'An account with this email already exists but is not verified. Please check your email or request a new verification link.',
            code: 'EMAIL_NOT_VERIFIED',
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(password)
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: finalName,
          email,
          passwordHash,
          role: UserRole.CLIENT,
          emailVerified: null,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: tokenExpiry,
        }
      })

      const existingClients = await tx.client.findMany({
        select: { clientNumber: true }
      })
      
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
      const normalizedPhoneValue = phone ? normalizePhone(phone) : null
      
      const clientProfile = await tx.client.create({
        data: {
          clientNumber,
          name,
          email,
          phone: normalizedPhoneValue,
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

    // Send verification email — required before login
    try {
      const emailResult = await sendEmailVerificationEmail(
        result.user.email,
        result.user.name || name,
        verificationToken
      )
      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error)
      }
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
    }

    return NextResponse.json({
      data: {
        requiresEmailVerification: true,
        email: result.user.email,
        message: 'Registration successful. Please verify your email before signing in.',
      }
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    
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
    
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid reference: related record not found' },
        { status: 400 }
      )
    }
    
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
