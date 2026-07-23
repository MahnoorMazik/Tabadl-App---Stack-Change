import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { verifyPassword, hashPassword } from '@/lib/password'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New password and confirmation do not match',
  path: ['confirmPassword'],
})

export const POST = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  try {
    const body = await request.json()
    const validationResult = changePasswordSchema.safeParse(body)

    if (!validationResult.success) {
      const details = validationResult.error.issues?.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      })) || []

      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid input data provided.',
        400,
        { 
          requestId, 
          details,
          suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR)
        }
      ))
    }

    const { currentPassword, newPassword } = validationResult.data

    // Get user with password hash
    const dbUser = await db.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        passwordHash: true,
        tokenVersion: true,
      }
    })

    if (!dbUser) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'User not found.',
        404,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
      ))
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, dbUser.passwordHash)
    if (!isValidPassword) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.AUTHENTICATION_ERROR,
        'Current password is incorrect.',
        401,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.AUTHENTICATION_ERROR) }
      ))
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password and increment tokenVersion to invalidate other sessions
    await db.user.update({
      where: { id: user.userId },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: { increment: 1 }, // Increment to invalidate all other tokens
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        staffType: true,
        tokenVersion: true,
      }
    })

    // With NextAuth, the session is managed by NextAuth
    // The client should call update() on the session to refresh it
    return addCorsHeaders(createSuccessResponse(
      { 
        message: 'Password changed successfully. Please refresh your session.',
        requiresSessionRefresh: true
      },
      200,
      { requestId, message: 'Password changed successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/profile/change-password',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to change password.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.INTERNAL_ERROR)
      }
    ))
  }
})

