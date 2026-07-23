import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { z } from 'zod'
import { ExpenseCategory } from '@prisma/client'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

const expenseSchema = z.object({
  description: z.string().min(2),
  amount: z.number().min(0),
  category: z.nativeEnum(ExpenseCategory),
  vendor: z.string().optional(),
  expenseDate: z.string().optional(),
  notes: z.string().optional(),
})

// GET /api/expenses - Get all expenses
export const GET = withAuth(async (request) => {
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

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') as ExpenseCategory | null
  const approved = searchParams.get('approved')

  try {
    const where: any = {}
    if (category) where.category = category
    if (approved === 'true') {
      where.approvedById = { not: null }
    } else if (approved === 'false') {
      where.approvedById = null
    }

    const expenses = await db.expense.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return addCorsHeaders(createSuccessResponse(
      { expenses },
      200,
      { requestId, message: 'Expenses retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/expenses',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch expenses.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

// POST /api/expenses - Create a new expense
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
    const data = expenseSchema.parse(body)

    const expense = await db.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
        category: data.category,
        vendor: data.vendor,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        notes: data.notes,
        createdById: user.userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return addCorsHeaders(createSuccessResponse(
      { expense },
      201,
      { requestId, message: 'Expense created successfully' }
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
      endpoint: '/api/expenses',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to create expense.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

