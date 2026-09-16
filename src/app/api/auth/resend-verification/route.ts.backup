import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmailVerificationEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import crypto from 'crypto'
import { UserRole } from '@prisma/client'

const resendSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = resendSchema.parse(body)

    const rateLimitResponse = checkRateLimit(`resend-verification:${email}`, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
      message: 'Too many verification emails. Please try again later.',
    })
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const user = await db.user.findFirst({
      where: {
        email,
        isDeleted: false,
        role: UserRole.CLIENT,
      },
    })

    // Always return success-style response to avoid email enumeration
    const genericSuccess = NextResponse.json({
      data: {
        message:
          'If an unverified account exists for this email, a verification link has been sent.',
      },
    })

    if (!user || user.emailVerified) {
      return genericSuccess
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: tokenExpiry,
      },
    })

    const emailResult = await sendEmailVerificationEmail(
      user.email,
      user.name || user.email,
      verificationToken
    )

    if (!emailResult.success) {
      console.error('[ResendVerification] Email failed:', emailResult.error)
      return NextResponse.json(
        {
          error:
            emailResult.error ||
            'Failed to send verification email. Please try again later.',
        },
        { status: 500 }
      )
    }

    return genericSuccess
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }
    console.error('[ResendVerification] Error:', error)
    return NextResponse.json(
      { error: 'Failed to resend verification email.' },
      { status: 500 }
    )
  }
}
