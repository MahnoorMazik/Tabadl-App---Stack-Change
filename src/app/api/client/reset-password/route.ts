import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { createErrorResponse, createSuccessResponse, getRequestId, logError, ErrorCodes } from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    const body = await request.json()
    const validationResult = resetPasswordSchema.safeParse(body)

    if (!validationResult.success) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Invalid input data',
          400,
          { requestId, details: validationResult.error.issues }
        )
      )
    }

    const { token, newPassword } = validationResult.data

    // ✅ Find user with valid token
    const user = await db.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpiry: { gt: new Date() },
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

    if (!user) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.NOT_FOUND_ERROR,
          'Invalid or expired reset token. Please request a new password reset.',
          400,
          { requestId }
        )
      )
    }

    // ✅ Only allow clients - Fixed: Use AUTHORIZATION_ERROR instead of FORBIDDEN_ERROR
    if (user.role !== 'CLIENT' && user.role !== 'COLLABORATOR') {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.AUTHORIZATION_ERROR,
          'Invalid request',
          403,
          { requestId }
        )
      )
    }

    // ✅ Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // ✅ Update password and clear reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        tokenVersion: { increment: 1 }, // Invalidate all sessions
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        updatedAt: new Date(),
      },
    })

    // ✅ Create audit log
    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          entityType: 'USER',
          entityId: user.id,
          entityName: user.email,
          action: 'PASSWORD_RESET_COMPLETED',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          changes: JSON.stringify({
            action: 'Password reset completed via forgot password',
            timestamp: new Date().toISOString(),
          }),
        },
      })
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError)
    }

    return addCorsHeaders(
      createSuccessResponse(
        {
          message: 'Password reset successfully. Please login with your new password.',
        },
        200,
        { requestId }
      )
    )

  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/client/reset-password',
      method: 'POST',
    })

    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to reset password',
        500,
        { requestId }
      )
    )
  }
}