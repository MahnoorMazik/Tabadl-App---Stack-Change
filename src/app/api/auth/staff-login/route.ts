import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'

/**
 * Validates staff credentials only. Returns specific errors for UX.
 * Does not create a session. Client must call signIn('credentials', ...) on success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Please enter your email' },
        { status: 200 }
      )
    }
    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Please enter your password' },
        { status: 200 }
      )
    }

    const user = await db.user.findFirst({
      where: { email, isDeleted: false }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email' },
        { status: 200 }
      )
    }

    if (user.role !== UserRole.STAFF) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 200 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is inactive. Contact an administrator.' },
        { status: 200 }
      )
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 200 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[staff-login]', e)
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
