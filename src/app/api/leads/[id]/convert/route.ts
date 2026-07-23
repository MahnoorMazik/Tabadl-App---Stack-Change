import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withPermission, requireAuth } from '@/lib/rbac-middleware'
import { Module, Action } from '@/lib/rbac'
import { hashPassword, generateRandomPassword } from '@/lib/password'
import { normalizePhone } from '@/lib/phone-normalization'
import { z } from 'zod'
import { UserRole } from '@prisma/client'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

const convertSchema = z.object({
  email: z.string().email().optional(),
})

// POST /api/leads/[id]/convert - Convert lead to client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHENTICATION_ERROR,
      authResult.error || 'Authentication failed',
      authResult.status || 401,
      { requestId, suggestion: getErrorSuggestion(ErrorCodes.AUTHENTICATION_ERROR) }
    ))
  }

  const { user } = authResult
  const paramsResolved = await params
  const id = paramsResolved.id
  
  if (!id) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Lead ID is required',
      400,
      { requestId }
    ))
  }

  if (!user.permissions?.includes('leads.manage')) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.FORBIDDEN,
      'You do not have permission to convert leads.',
      403,
      { requestId, suggestion: getErrorSuggestion(ErrorCodes.FORBIDDEN) }
    ))
  }

  try {
    // Check if lead exists and is not soft-deleted
    const lead = await db.lead.findFirst({
      where: { id: id as string, isDeleted: false },
    })

    if (!lead) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Lead not found.',
        404,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
      ))
    }

    if (lead.clientId) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Lead has already been converted.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    const body = await request.json()
    const { email: convertEmail } = convertSchema.parse(body)

    // Use provided email or lead email
    const clientEmail = convertEmail || lead.email

    // Check if email already exists for an ACTIVE (non-deleted) user
    const existingUser = await db.user.findFirst({
      where: { email: clientEmail, isDeleted: false },
    })

    if (existingUser) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Email address is already registered.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    const plainPassword = generateRandomPassword()
    const passwordHash = await hashPassword(plainPassword)

    // Normalize phone number if provided
    const normalizedPhoneValue = lead.phone ? normalizePhone(lead.phone) : null

    // Create user and client in a transaction
    const result = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: clientEmail,
          name: lead.fullName,
          passwordHash,
          role: UserRole.CLIENT,
        },
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

      const client = await tx.client.create({
        data: {
          clientNumber,
          name: lead.fullName,
          email: clientEmail,
          phone: normalizedPhoneValue,
          company: lead.companyName || null,
          companyType: lead.companyType || null,
          designation: lead.designation || null,
          natureOfBusiness: lead.natureOfBusiness || null,
          country: lead.country || null,
          city: lead.city || null,
          howDidYouHear: lead.howDidYouHear || null,
          userId: newUser.id,
        },
      })

      // Update lead status to CONVERTED (if configured) and link to client
      let convertedStatus =
        (await tx.leadStatus.findFirst({ where: { name: 'Converted' } })) ||
        (await tx.leadStatus.findFirst({
          where: { type: 'WON' },
          orderBy: { createdAt: 'asc' },
        }))

      const updateData: any = { clientId: client.id }
      if (convertedStatus) {
        updateData.statusId = convertedStatus.id
      }

      await tx.lead.update({
        where: { id: id as string },
        data: updateData,
      })

      return { user: newUser, client }
    })

    // Notify via global event settings
    try {
      const { dispatchEvent } = await import('@/lib/notifications/service')
      await dispatchEvent({
        eventType: 'CLIENT_CONVERSION',
        title: 'Lead Converted to Client',
        message: `${lead.fullName} (${lead.leadNumber}) has been converted to a client.`,
        entityType: 'Lead',
        entityId: id as string,
        assignedUserId: lead.assignedToId,
        url: '/admin/leads',
      })
    } catch (notifError) {
      console.error('[Notification] Failed to send conversion notification:', notifError)
    }

    try {
      const { sendAccountCredentialsEmail } = await import('@/lib/email')
      await sendAccountCredentialsEmail(clientEmail, lead.fullName, plainPassword, 'Client')
    } catch (emailError) {
      console.error('[LeadConvert] Failed to send credentials email:', emailError)
    }

    const { logCreateActivity } = await import('@/lib/activity-tracking')
    await logCreateActivity(
      { userId: user.userId },
      'Client',
      result.client.id,
      lead.fullName,
      { email: clientEmail, leadId: id, leadNumber: lead.leadNumber },
      request
    )

    return addCorsHeaders(createSuccessResponse(
      {
        client: result.client,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      },
      200,
      { requestId, message: 'Lead converted to client successfully. Login credentials sent via email.' }
    ))
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const details = error.issues?.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      })) || []
      
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed.',
        400,
        { requestId, details, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }
    
    // Handle unique constraint violation (email already exists)
    if (error?.code === 'P2002' && error?.meta?.target?.includes('email')) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Email address is already registered. Please use a different email address.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }
    
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/leads/[id]/convert',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to convert lead to client.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
}

