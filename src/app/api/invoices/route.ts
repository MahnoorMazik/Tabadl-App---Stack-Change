import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import { InvoiceStatus, UserRole } from '@prisma/client'
import { notifyInvoiceCreated } from '@/lib/notifications'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

const invoiceSchema = z.object({
  clientId: z.string(),
  amount: z.number().min(0),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
})

// Generate unique invoice number with race condition protection
async function generateInvoiceNumber(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const prefix = `INV-${year}${month}`
  
  // Find the highest existing invoice number with this prefix
  const lastInvoice = await db.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
    select: {
      invoiceNumber: true,
    },
  })

  let nextNumber = 1
  if (lastInvoice) {
    const match = lastInvoice.invoiceNumber.match(/-(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }

  return `${prefix}-${String(nextNumber).padStart(4, '0')}`
}

// GET /api/invoices - Get all invoices (with filtering)
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!
  const { searchParams } = new URL(request.url)
  
  const status = searchParams.get('status') as InvoiceStatus | null
  const clientId = searchParams.get('clientId')

  try {
    const where: any = {}

    // If client, filter by their invoices
    if (user.role === UserRole.CLIENT) {
      const client = await db.client.findUnique({
        where: { userId: user.userId },
      })
      
      if (client) {
        where.clientId = client.id
      } else {
        return addCorsHeaders(createSuccessResponse(
          { invoices: [] },
          200,
          { requestId, message: 'No invoices found' }
        ))
      }
    }

    if (status) where.status = status
    if (clientId && user.permissions?.includes('financial.manage')) where.clientId = clientId

    const invoices = await db.invoice.findMany({
      where,
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return addCorsHeaders(createSuccessResponse(
      { invoices },
      200,
      { requestId, message: 'Invoices retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/invoices',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch invoices.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

// POST /api/invoices - Create a new invoice
export const POST = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  if (!user.permissions?.includes('financial.manage')) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHORIZATION_ERROR,
      'Financial management permission required.',
      403,
      { requestId }
    ))
  }

  try {
    const body = await request.json()
    const data = invoiceSchema.parse(body)

    const invoiceNumber = await generateInvoiceNumber()

    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        clientId: data.clientId,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: InvoiceStatus.DRAFT,
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Notify client about new invoice
    await notifyInvoiceCreated(data.clientId, invoiceNumber)

    return addCorsHeaders(createSuccessResponse(
      { invoice },
      201,
      { requestId, message: 'Invoice created successfully' }
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

    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/invoices',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to create invoice.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

