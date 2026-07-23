import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'
import { addSoftDeleteFilter } from '@/lib/soft-delete'

// GET /api/applications - Get user's applications
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  try {
    const where: any = {}

    // If user is a client, only show their applications
    if (user.role === 'CLIENT') {
      // Find the client record for this user
      const client = await db.client.findUnique({
        where: { userId: user.userId }
      })
      
      if (!client) {
        return addCorsHeaders(createSuccessResponse(
          { 
            applications: [],
            pagination: {
              page: 1,
              limit: 0,
              total: 0,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            }
          },
          200,
          { requestId, message: 'No applications found' }
        ))
      }
      
      where.clientId = client.id
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      where.status = status
    }

    // Add search functionality
    if (search) {
      // Sanitize search input
      const sanitizedSearch = search.replace(/['"\\]/g, '')
      where.OR = [
        { applicationNumber: { contains: sanitizedSearch } },
        { companyName: { contains: sanitizedSearch } },
        { client: { user: { name: { contains: sanitizedSearch } } } },
        { client: { user: { email: { contains: sanitizedSearch } } } },
      ]
    }

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limitParam = searchParams.get('limit')
    const limit = limitParam === 'all' ? undefined : parseInt(limitParam || '25', 10)

    // Get total count for pagination (only non-deleted applications)
    const activeWhere = addSoftDeleteFilter(where)
    const total = await db.application.count({ 
      where: activeWhere
    })

    // Calculate pagination
    const totalPages = limit ? Math.ceil(total / limit) : 1
    const skip = limit ? (page - 1) * limit : undefined
    const take = limit || undefined

    const applications = await db.application.findMany({
      where: activeWhere,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        assignedTo: {
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
      skip,
      take,
    })

    return addCorsHeaders(createSuccessResponse(
      { 
        applications,
        pagination: {
          page,
          limit: limit || total,
          total,
          totalPages,
          hasNextPage: limit ? page < totalPages : false,
          hasPreviousPage: limit ? page > 1 : false,
        }
      },
      200,
      { requestId, message: 'Applications retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/applications',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch applications.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

// POST /api/applications - Create new application
export const POST = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  try {
    const body = await request.json()
    const {
      type,
      companyName,
      licenseType,
      visaType,
      bankName,
      serviceDetails,
      description,
      notes,
    } = body

    // Validate required fields
    if (!type) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Application type is required.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    // Generate application number (check ALL applications including deleted ones)
    // applicationNumber has @unique constraint, so we need to check ALL applications
    const existingApplications = await db.application.findMany({
      select: { applicationNumber: true }
    })
    
    // Extract all numbers and find the maximum
    let maxNumber = 0
    for (const app of existingApplications) {
      if (app.applicationNumber) {
        const match = app.applicationNumber.match(/^APP-(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      }
    }
    
    const applicationNumber = `APP-${maxNumber + 1}`

    // Find the client record for this user
    const client = await db.client.findUnique({
      where: { userId: user.userId }
    })
    
    if (!client) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Client profile not found.',
        404,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
      ))
    }

    // Create application
    const application = await db.application.create({
      data: {
        applicationNumber,
        title: `${type.replace('_', ' ').toLowerCase()} application`,
        type,
        clientId: client.id,
        companyName: companyName || null,
        licenseType: licenseType || null,
        visaType: visaType || null,
        bankName: bankName || null,
        serviceDetails: serviceDetails || null,
        description: description || null,
        notes: notes || null,
        status: 'PENDING',
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
      },
    })

    // Create notification for admins
    const admins = await db.user.findMany({
      where: {
        role: 'STAFF',
        staffType: 'ADMIN',
        isActive: true,
      },
    })

    for (const admin of admins) {
      await db.notification.create({
        data: {
          userId: admin.id,
          title: 'New Application Submitted',
          message: `${user.name} has submitted a new ${type.replace('_', ' ').toLowerCase()} application`,
        },
      })
    }

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
      endpoint: '/api/applications',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to create application.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

