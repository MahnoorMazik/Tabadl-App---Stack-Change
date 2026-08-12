import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { createErrorResponse, createSuccessResponse, getRequestId, logError, ErrorCodes } from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'
import { z } from 'zod'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    const body = await request.json()
    const validationResult = forgotPasswordSchema.safeParse(body)

    if (!validationResult.success) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid email address',
          400,
          { requestId, details: validationResult.error.issues }
        )
      )
    }

    const { email } = validationResult.data

    const rateLimitResponse = checkRateLimit(`admin-forgot-password:${email}`, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
      message: 'Too many password reset attempts. Please try again after 1 hour.',
    })

    if (rateLimitResponse) {
      return addCorsHeaders(rateLimitResponse)
    }

    const user = await db.user.findFirst({
      where: {
        email,
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    // Always return the same message to avoid email enumeration
    const successMessage = {
      message: 'If an account exists with this email, you will receive a password reset link.',
    }

    if (!user || (user.role !== 'STAFF' && user.role !== 'ADMIN')) {
      return addCorsHeaders(createSuccessResponse(successMessage, 200, { requestId }))
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000)

    await db.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: tokenExpiry,
      },
    })

    try {
      await sendPasswordResetEmail(user.email, user.name || 'Staff', resetToken, 'admin')
    } catch (emailError) {
      console.error('[ADMIN-FORGOT-PASSWORD] Email error:', emailError)
    }

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          entityType: 'USER',
          entityId: user.id,
          entityName: user.email,
          action: 'PASSWORD_RESET_REQUESTED',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          changes: JSON.stringify({
            action: 'Staff password reset requested',
            timestamp: new Date().toISOString(),
          }),
        },
      })
    } catch (auditError) {
      console.error('[ADMIN-FORGOT-PASSWORD] Audit log failed:', auditError)
    }

    return addCorsHeaders(createSuccessResponse(successMessage, 200, { requestId }))
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/admin/forgot-password',
      method: 'POST',
    })

    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to process password reset request',
        500,
        { requestId }
      )
    )
  }
}
