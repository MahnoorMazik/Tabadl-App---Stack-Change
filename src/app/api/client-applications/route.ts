import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { ApplicationStatus, UserRole } from '@prisma/client'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

// GET /api/client-applications - Get client applications
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const clientId = searchParams.get('clientId')

  try {
    const where: any = {}

    // If user is a client, only show their applications
    if (user.role === UserRole.CLIENT) {
      // Find client record for this user
      const client = await db.client.findUnique({
        where: { userId: user.userId }
      })
      
      if (!client) {
        return addCorsHeaders(createSuccessResponse(
          { applications: [] },
          200,
          { requestId, message: 'No applications found' }
        ))
      }
      
      where.clientId = client.id
    } else if (clientId) {
      // Staff can filter by client ID
      where.clientId = clientId
    }

    // Filter by status if provided
    if (status) {
      where.status = status as ApplicationStatus
    }

    const applications = await db.application.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
          },
        },
        documents: {
          select: {
            id: true,
            filename: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return addCorsHeaders(createSuccessResponse(
      { applications },
      200,
      { requestId, message: 'Applications retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/client-applications',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch client applications.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

// POST /api/client-applications - Create new client application
export const POST = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!
  
  try {
    const body = await request.json()
    const { clientId, type, title, description, assignedToId } = body

    if (!type || !title) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Type and title are required.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    // Generate application number
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const prefix = `APP-${year}${month}`
    
    const lastApp = await db.application.findFirst({
      where: { applicationNumber: { startsWith: prefix } },
      orderBy: { applicationNumber: 'desc' },
      select: { applicationNumber: true }
    })
    
    let nextNumber = 1
    if (lastApp) {
      const match = lastApp.applicationNumber.match(/-(\d+)$/)
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }
    
    const applicationNumber = `${prefix}-${String(nextNumber).padStart(4, '0')}`

    const application = await db.application.create({
      data: {
        applicationNumber,
        title,
        type,
        description,
        clientId,
        assignedToId: assignedToId || null,
        status: ApplicationStatus.PENDING,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            company: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
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
      { application },
      201,
      { requestId, message: 'Application created successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/client-applications',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to create client application.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})
