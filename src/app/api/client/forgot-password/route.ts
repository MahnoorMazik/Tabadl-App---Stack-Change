import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createErrorResponse, createSuccessResponse, getRequestId, logError, ErrorCodes } from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'
import { z } from 'zod'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    // 🔴 LOG 1: API called
    console.log('========================================')
    console.log('📧 [FORGOT-PASSWORD] ===== API CALLED =====')
    console.log('📧 [FORGOT-PASSWORD] Request ID:', requestId)
    console.log('========================================')

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
    
    // 🔴 LOG 2: Email received
    console.log('📧 [FORGOT-PASSWORD] Email received:', email)

    // Rate limiting
    const rateLimitId = `forgot-password:${email}`
    const rateLimitResponse = checkRateLimit(rateLimitId, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
      message: 'Too many password reset attempts. Please try again after 1 hour.',
    })

    if (rateLimitResponse) {
      console.log('📧 [FORGOT-PASSWORD] Rate limit exceeded for:', email)
      return addCorsHeaders(rateLimitResponse)
    }

    // Find user
    // 🔴 LOG 3: Searching for user
    console.log('📧 [FORGOT-PASSWORD] Searching for user with email:', email)

    const user = await db.user.findFirst({
      where: {
        email: email,
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

    // 🔴 LOG 4: User found or not
    if (user) {
      console.log('📧 [FORGOT-PASSWORD] ✅ User found!')
      console.log('📧 [FORGOT-PASSWORD] User ID:', user.id)
      console.log('📧 [FORGOT-PASSWORD] User Email:', user.email)
      console.log('📧 [FORGOT-PASSWORD] User Role:', user.role)
    } else {
      console.log('📧 [FORGOT-PASSWORD] ❌ User NOT found for email:', email)
    }

    if (!user) {
      return addCorsHeaders(
        createSuccessResponse(
          {
            message: 'If an account exists with this email, you will receive a password reset link.',
          },
          200,
          { requestId }
        )
      )
    }

    if (user.role !== 'CLIENT' && user.role !== 'COLLABORATOR') {
      console.log('📧 [FORGOT-PASSWORD] ⚠️ User role is not CLIENT. Role:', user.role)
      return addCorsHeaders(
        createSuccessResponse(
          {
            message: 'If an account exists with this email, you will receive a password reset link.',
          },
          200,
          { requestId }
        )
      )
    }

    // Generate reset token
    // 🔴 LOG 5: Generating token
    console.log('📧 [FORGOT-PASSWORD] Generating reset token...')
    
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000)
    
    console.log('📧 [FORGOT-PASSWORD] ✅ Token generated:')
    console.log('📧 [FORGOT-PASSWORD] Token:', resetToken)
    console.log('📧 [FORGOT-PASSWORD] Expiry:', tokenExpiry.toISOString())

    // Store token in database
    // 🔴 LOG 6: Saving token to database
    console.log('📧 [FORGOT-PASSWORD] Saving token to database...')

    await db.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: tokenExpiry,
      },
    })

    console.log('📧 [FORGOT-PASSWORD] ✅ Token saved to database')

    // Send email
    // 🔴 LOG 7: About to send email
    console.log('========================================')
    console.log('📧 [FORGOT-PASSWORD] ===== SENDING EMAIL =====')
    console.log('📧 [FORGOT-PASSWORD] To:', user.email)
    console.log('📧 [FORGOT-PASSWORD] Name:', user.name || 'User')
    console.log('📧 [FORGOT-PASSWORD] Token:', resetToken)
    console.log('📧 [FORGOT-PASSWORD] Reset URL:', `http://localhost:3000/client/reset-password/${resetToken}`)
    console.log('========================================')
    
    try {
      const emailResult = await sendPasswordResetEmail(
        user.email, 
        user.name || 'User', 
        resetToken, 
        'client'
      )
      
      // 🔴 LOG 8: Email result
      console.log('========================================')
      console.log('📧 [FORGOT-PASSWORD] ===== EMAIL RESULT =====')
      console.log('📧 [FORGOT-PASSWORD] Success:', emailResult.success)
      console.log('📧 [FORGOT-PASSWORD] MessageId:', emailResult.messageId || 'N/A')
      console.log('📧 [FORGOT-PASSWORD] Response:', emailResult.response || 'N/A')
      console.log('📧 [FORGOT-PASSWORD] Error:', emailResult.error || 'No error')
      console.log('📧 [FORGOT-PASSWORD] Transport Used:', emailResult.transportUsed || 'N/A')
      console.log('========================================')
    } catch (emailError: any) {
      // 🔴 LOG 9: Email error
      console.error('========================================')
      console.error('📧 [FORGOT-PASSWORD] ❌ EMAIL ERROR!')
      console.error('📧 [FORGOT-PASSWORD] Error:', emailError)
      console.error('📧 [FORGOT-PASSWORD] Error Stack:', emailError?.stack)
      console.error('========================================')
    }

    // Create audit log
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
            action: 'Password reset requested',
            timestamp: new Date().toISOString(),
          }),
        },
      })
      console.log('📧 [FORGOT-PASSWORD] ✅ Audit log created')
    } catch (auditError) {
      console.error('📧 [FORGOT-PASSWORD] Failed to create audit log:', auditError)
    }

    console.log('📧 [FORGOT-PASSWORD] ===== API COMPLETED =====')
    console.log('========================================')

    return addCorsHeaders(
      createSuccessResponse(
        {
          message: 'If an account exists with this email, you will receive a password reset link.',
        },
        200,
        { requestId }
      )
    )

  } catch (error: any) {
    // 🔴 LOG 10: API Error
    console.error('========================================')
    console.error('📧 [FORGOT-PASSWORD] ❌ API ERROR!')
    console.error('📧 [FORGOT-PASSWORD] Error:', error)
    console.error('📧 [FORGOT-PASSWORD] Error Stack:', error?.stack)
    console.error('========================================')
    
    logError(error, {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/client/forgot-password',
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