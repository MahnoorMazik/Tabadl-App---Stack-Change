import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, withPermission, requireAuth } from '@/lib/rbac-middleware'
import { Module, Action } from '@/lib/rbac'
import { normalizePhone } from '@/lib/phone-normalization'
import { z } from 'zod'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'
import { softDeleteLeadCascade } from '@/lib/soft-delete-cascade'

const updateLeadSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  // Prefer statusId, but keep legacy "status" string for backward compatibility
  statusId: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
})

// GET /api/leads/[id] - Get a single lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 GET /api/leads/[id] - Starting request')
    
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      console.log('❌ Authentication failed:', authResult.error)
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.AUTHENTICATION_ERROR,
        authResult.error || 'Unauthorized',
        authResult.status,
        { 
          requestId: getRequestId(request),
          suggestion: getErrorSuggestion(ErrorCodes.AUTHENTICATION_ERROR)
        }
      ))
    }

    console.log('✅ Authentication successful')
    
    // Properly await params in Next.js 13+
    const { id } = await params
    console.log('📝 Resolved params ID:', id)

    if (!id || typeof id !== 'string') {
      console.error('❌ Invalid lead ID:', id)
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid lead ID.',
        400,
        { 
          requestId: getRequestId(request),
          suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR)
        }
      ))
    }

    const lead = await db.lead.findFirst({
      where: { id, isDeleted: false },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: true,
        status: true,
      },
    })

    console.log('🔍 Lead query result:', lead ? 'Found' : 'Not found')

    if (!lead) {
      console.log('❌ Lead not found with ID:', id)
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Lead not found.',
        404,
        { 
          requestId: getRequestId(request),
          suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR)
        }
      ))
    }

    console.log('✅ Lead found successfully')
    return addCorsHeaders(createSuccessResponse(
      { lead },
      200,
      { requestId: getRequestId(request), message: 'Lead retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId: getRequestId(request),
      endpoint: '/api/leads/[id]',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name
    })
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch lead.',
      500,
      { 
        requestId: getRequestId(request),
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
}

// PATCH /api/leads/[id] - Update a lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.AUTHENTICATION_ERROR,
        authResult.error || 'Unauthorized',
        authResult.status,
        { 
          requestId: getRequestId(request),
          suggestion: getErrorSuggestion(ErrorCodes.AUTHENTICATION_ERROR)
        }
      ))
  }

  const { user } = authResult
  const { id } = await params

  if (!user.permissions?.includes('leads.manage')) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.AUTHORIZATION_ERROR,
        'Forbidden',
        403,
        { 
          requestId: getRequestId(request),
          suggestion: getErrorSuggestion(ErrorCodes.AUTHORIZATION_ERROR)
        }
      ))
  }

  try {
    const body = await request.json()
    const data = updateLeadSchema.parse(body)

    // Fetch existing lead to enforce non-editable status for converted leads
    const existingLead = await db.lead.findUnique({
      where: { id },
      include: { status: true },
    })

    // Normalize phone number if provided
    const normalizedPhoneValue = data.phone !== undefined 
      ? (data.phone ? normalizePhone(data.phone) : null)
      : undefined

    let { statusId, status, ...rest } = data

    // If only legacy "status" string is provided, resolve it to a statusId
    if (!statusId && status) {
      const statusRecord = await db.leadStatus.findFirst({
        where: { name: status },
      })
      if (statusRecord) {
        statusId = statusRecord.id
      }
    }

    // If lead is already converted (has clientId or "Converted" status), ignore status changes
    if (existingLead && (existingLead.clientId || existingLead.status?.name === 'Converted')) {
      statusId = undefined
    }

    const lead = await db.lead.update({
      where: { id },
      data: {
        ...rest,
        ...(statusId !== undefined && { statusId }),
        ...(normalizedPhoneValue !== undefined && { 
          phone: data.phone, // Keep original phone format
          normalizedPhone: normalizedPhoneValue // Update normalized phone
        }),
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

    return addCorsHeaders(createSuccessResponse(
      { lead },
      200,
      { requestId: getRequestId(request), message: 'Lead updated successfully' }
    ))
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        400,
        { 
          requestId: getRequestId(request),
          details,
          suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR)
        }
      ))
    }
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId: getRequestId(request),
      endpoint: '/api/leads/[id]',
      method: 'PATCH',
      additionalContext: { errorType: error.constructor.name }
    })
    console.error('Error updating lead:', error)
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to update lead.',
      500,
      { 
        requestId: getRequestId(request),
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
}

// DELETE /api/leads/[id] - Delete a lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🗑️ DELETE /api/leads/[id] - Starting delete request')
    
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      console.error('❌ DELETE /api/leads/[id] - Auth failed:', authResult.error)
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user } = authResult
    console.log('✅ DELETE /api/leads/[id] - Auth successful, user:', user.email)
    
    const { id } = await params
    console.log('📝 DELETE /api/leads/[id] - Resolved params ID:', id)

    if (!id || typeof id !== 'string') {
      console.error('❌ DELETE /api/leads/[id] - Invalid ID:', id)
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
    }

    if (!user.permissions?.includes('leads.manage')) {
      console.error('❌ DELETE /api/leads/[id] - Permission denied for user:', user.email)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if lead exists first (not soft-deleted)
    const existingLead = await db.lead.findFirst({
      where: { id, isDeleted: false },
      select: { id: true }
    })

    if (!existingLead) {
      console.error('❌ DELETE /api/leads/[id] - Lead not found:', id)
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    console.log('🔄 DELETE /api/leads/[id] - Performing cascade soft delete for lead:', id)
    await db.$transaction(async (tx) => {
      await softDeleteLeadCascade(tx, id)
    })

    console.log('✅ DELETE /api/leads/[id] - Lead marked as deleted successfully:', id)
    return addCorsHeaders(createSuccessResponse(
      { message: 'Lead deleted successfully' },
      200,
      { requestId: getRequestId(request), message: 'Lead deleted successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId: getRequestId(request),
      endpoint: '/api/leads/[id]',
      method: 'DELETE',
      additionalContext: { errorType: error.constructor.name, prismaCode: error?.code }
    })
    console.error('❌ DELETE /api/leads/[id] - Error deleting lead:', {
      error: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
      fullError: error
    })
    
    // Handle Prisma errors
    if (error?.code === 'P2025') {
      console.error('❌ DELETE /api/leads/[id] - Lead not found (P2025):', error)
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Lead not found.',
        404,
        { 
          requestId: getRequestId(request),
          suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR)
        }
      ))
    }
    
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to delete lead.',
      500,
      { 
        requestId: getRequestId(request),
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
}

