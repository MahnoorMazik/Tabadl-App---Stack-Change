import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { validateEmail } from '@/lib/email-validation'
import { normalizePhone } from '@/lib/phone-normalization'
import { createErrorResponse, createSuccessResponse, getRequestId, logError, ErrorCodes, getErrorSuggestion } from '@/lib/error-handler'
import { withAuth } from '@/lib/rbac-middleware'

const leadImportSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  companyType: z.string().optional(),
  natureOfBusiness: z.string().optional(),
  designation: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  howDidYouHear: z.string().optional(),
  businessTypes: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
})

// POST /api/leads/import - Import a single lead
export const POST = withAuth(async (request: NextRequest) => {
  const requestId = getRequestId(request)
  
  try {
    const body = await request.json()
    
    // Log the incoming data for debugging
    console.log('Lead import data:', JSON.stringify(body, null, 2))
    
    // Validate email format
    const emailValidation = validateEmail(body.email)
    if (!emailValidation.isValid) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        emailValidation.error!,
        400,
        { 
          requestId, 
          details: [{
            field: 'email',
            message: emailValidation.error!
          }]
        }
      )
    }

    // Check for duplicate email (only among non-deleted leads)
    const existingLead = await db.lead.findFirst({
      where: { email: body.email, isDeleted: false }
    })

    if (existingLead) {
      return createErrorResponse(
        ErrorCodes.DUPLICATE_RESOURCE,
        'A lead with this email already exists.',
        409,
        { 
          requestId, 
          details: [{
            field: 'email',
            message: 'A lead with this email already exists.'
          }],
          context: { duplicate: true }
        }
      )
    }

    // Validate the form data
    const data = leadImportSchema.parse(body)

    // Parse business types if provided
    let businessTypesString = ''
    if (data.businessTypes) {
      try {
        // If it's already a JSON string, use it
        if (data.businessTypes.startsWith('[') || data.businessTypes.startsWith('"')) {
          businessTypesString = data.businessTypes
        } else {
          // If it's a comma-separated string, convert to JSON array
          const types = data.businessTypes.split(',').map(t => t.trim()).filter(t => t)
          businessTypesString = JSON.stringify(types)
        }
      } catch (error) {
        // If parsing fails, store as plain string
        businessTypesString = data.businessTypes
      }
    }

    // Generate lead number (check ALL leads including deleted ones)
    // leadNumber has @unique constraint, so we need to check ALL leads
    const existingLeads = await db.lead.findMany({
      select: { leadNumber: true }
    })
    
    // Extract all numbers and find the maximum
    let maxNumber = 0
    for (const lead of existingLeads) {
      if (lead.leadNumber) {
        const match = lead.leadNumber.match(/LD-(\d+)/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      }
    }
    
    const leadNumber = `LD-${maxNumber + 1}`

    // Normalize phone number if provided
    const normalizedPhoneValue = data.phone ? normalizePhone(data.phone) : null

    // Determine default status (prefer "New", otherwise first OPEN type if exists)
    const defaultStatus =
      (await db.leadStatus.findFirst({ where: { name: 'New' } })) ||
      (await db.leadStatus.findFirst({
        where: { type: 'OPEN' },
        orderBy: { createdAt: 'asc' },
      }))

    // Create the lead
    const lead = await db.lead.create({
      data: {
        leadNumber,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone, // Store original phone
        normalizedPhone: normalizedPhoneValue, // Store normalized phone
        companyName: data.companyName,
        companyType: data.companyType,
        natureOfBusiness: data.natureOfBusiness,
        designation: data.designation,
        country: data.country,
        city: data.city,
        howDidYouHear: data.howDidYouHear,
        businessTypes: businessTypesString,
        source: data.source || 'CSV Import',
        notes: data.notes,
        ...(defaultStatus && { statusId: defaultStatus.id }),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return createSuccessResponse(
      { lead },
      201,
      { requestId, message: 'Lead imported successfully' }
    )

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      logError(error, {
        code: ErrorCodes.VALIDATION_ERROR,
        requestId,
        endpoint: '/api/leads/import',
        method: 'POST',
        additionalContext: { validationErrors: error.issues }
      })
      
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        { 
          requestId, 
          details: error.issues.map((issue: any) => ({
            field: issue.path[0] || 'unknown',
            message: issue.message,
            code: issue.code
          })),
          suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR)
        }
      )
    }
    
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: '/api/leads/import',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })
    
    return createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to import lead. Please try again.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    )
  }
})
