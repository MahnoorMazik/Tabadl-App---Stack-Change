import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendWelcomeEmail } from '@/lib/email'
import { z } from 'zod'

const verifySchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = verifySchema.parse(body)

    const user = await db.user.findFirst({
      where: {
        emailVerificationToken: token,
        isDeleted: false,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification link.' },
        { status: 400 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json({
        data: {
          message: 'Email is already verified. You can sign in.',
          alreadyVerified: true,
        },
      })
    }

    if (
      !user.emailVerificationExpiry ||
      user.emailVerificationExpiry < new Date()
    ) {
      return NextResponse.json(
        {
          error:
            'This verification link has expired. Please request a new one.',
          code: 'TOKEN_EXPIRED',
        },
        { status: 400 }
      )
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    })

    // Welcome email after successful verification (non-blocking)
    try {
      const emailSettings = await db.emailSettings.findFirst({
        orderBy: { createdAt: 'desc' },
      })
      if (emailSettings?.enableWelcomeEmail) {
        await sendWelcomeEmail(
          user.email,
          user.name || user.email
        )
      }
    } catch (emailError) {
      console.error('[VerifyEmail] Welcome email failed:', emailError)
    }

    return NextResponse.json({
      data: {
        message: 'Email verified successfully. You can now sign in.',
        email: user.email,
      },
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }
    console.error('[VerifyEmail] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify email. Please try again.' },
      { status: 500 }
    )
  }
}
