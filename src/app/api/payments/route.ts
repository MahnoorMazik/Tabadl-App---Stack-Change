import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { Module, Action } from '@/lib/rbac'
import { z } from 'zod'
import { PaymentMethod, InvoiceStatus } from '@prisma/client'
import { notifyPaymentReceived } from '@/lib/notifications'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

const paymentSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().min(0),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
})

// GET /api/payments - Get all payments
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  if (!user.permissions?.includes('financial.manage')) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHORIZATION_ERROR,
      'Access denied. Financial management permission required.',
      403,
      { requestId }
    ))
  }

  const { searchParams } = new URL(request.url)
  const invoiceId = searchParams.get('invoiceId')
  const clientId = searchParams.get('clientId')

  try {
    const where: any = {}
    if (invoiceId) where.invoiceId = invoiceId
    if (clientId) where.clientId = clientId

    const payments = await db.payment.findMany({
      where,
      include: {
        invoice: {
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return addCorsHeaders(createSuccessResponse(
      { payments },
      200,
      { requestId, message: 'Payments retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/payments',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch payments.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

// POST /api/payments - Record a new payment
export const POST = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  if (!user.permissions?.includes('financial.manage')) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHORIZATION_ERROR,
      'Access denied. Financial management permission required.',
      403,
      { requestId }
    ))
  }

  try {
    const body = await request.json()
    const data = paymentSchema.parse(body)

    // Get invoice and check remaining amount
    const invoice = await db.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { payments: true },
    })

    if (!invoice) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Invoice not found.',
        404,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
      ))
    }

    // Calculate total paid (payments don't have status field)
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    const remainingAmount = invoice.amount - totalPaid

    if (data.amount > remainingAmount) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Payment amount exceeds remaining balance of ${remainingAmount}`,
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: data.invoiceId,
          clientId: invoice.clientId,
          amount: data.amount,
          method: data.method,
          reference: data.reference || null,
        },
        include: {
          invoice: {
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
          },
        },
      })

      // Update invoice status if fully paid
      const newTotalPaid = totalPaid + data.amount
      if (newTotalPaid >= invoice.amount) {
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: {
            status: InvoiceStatus.PAID,
            paidAt: new Date(),
          },
        })
      } else if (invoice.status === InvoiceStatus.DRAFT) {
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: { status: InvoiceStatus.SENT },
        })
      }

      return payment
    })

    // Notify client about payment received
    await notifyPaymentReceived(invoice.clientId, data.amount)

    return addCorsHeaders(createSuccessResponse(
      { payment: result },
      201,
      { requestId, message: 'Payment recorded successfully' }
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
      endpoint: '/api/payments',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to create payment.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

