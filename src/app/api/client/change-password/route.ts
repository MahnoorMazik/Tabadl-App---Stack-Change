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
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import { sendPasswordChangeEmail } from '@/lib/email' // ✅ Fixed import

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
})

export const POST = withAuth(async (request: NextRequest) => {
  const requestId = getRequestId(request)
  // ✅ Fix: Access user from request.user (added by withAuth middleware)
  const user = (request as any).user

  try {
    // Rate limiting check - 5 attempts per hour for password changes
    const rateLimitId = getRateLimitIdentifier(request, user?.userId || 'anonymous')
    const rateLimitConfig = {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
      message: 'Too many password change attempts. Please try again after 1 hour.',
    }
    
    const rateLimitResponse = checkRateLimit(rateLimitId, rateLimitConfig)
    if (rateLimitResponse) {
      return addCorsHeaders(rateLimitResponse)
    }

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
      where: { id: user?.userId },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        tokenVersion: true,
        role: true,
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
      where: { id: user?.userId },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: { increment: 1 }, // Increment to invalidate all other tokens
        updatedAt: new Date(),
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

    // Create audit log for password change
    try {
      await db.auditLog.create({
        data: {
          userId: user?.userId,
          entityType: 'USER',
          entityId: user?.userId,
          entityName: dbUser.email,
          action: 'PASSWORD_CHANGE',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          changes: JSON.stringify({
            action: 'Client password changed',
            timestamp: new Date().toISOString(),
            role: dbUser.role,
          }),
        },
      })
    } catch (auditError) {
      // Log but don't fail the request
      console.error('Failed to create audit log:', auditError)
    }

    // Send email notification (async - don't await)
    try {
      // ✅ Fixed: Use correct function name
      await sendPasswordChangeEmail(dbUser.email, dbUser.name || 'Client')
        .catch(err => console.error('Email send failed:', err))
    } catch (emailError) {
      console.error('Email service error:', emailError)
    }

    return addCorsHeaders(createSuccessResponse(
      { 
        message: 'Password changed successfully. Please login again.',
        shouldLogout: true,
      },
      200,
      { requestId, message: 'Password changed successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      userId: user?.userId,
      endpoint: '/api/client/change-password',
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