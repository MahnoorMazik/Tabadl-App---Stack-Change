import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { saveUploadedFile } from '@/lib/file-upload'
import { DocumentStatus, UserRole } from '@prisma/client'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

// GET /api/documents - Get all documents (with filtering)
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!
  const { searchParams } = new URL(request.url)
  
  const status = searchParams.get('status') as DocumentStatus | null
  const applicationId = searchParams.get('applicationId')
  const leadId = searchParams.get('leadId')

  try {
    const where: any = {}

    if (status) where.status = status
    if (applicationId) where.applicationId = applicationId
    if (leadId) where.leadId = leadId

    // If client, filter by their applications
    if (user.role === UserRole.CLIENT) {
      const client = await db.client.findUnique({
        where: { userId: user.userId },
        include: { applications: { select: { id: true } } }
      })
      
      if (client) {
        where.applicationId = { in: client.applications.map(a => a.id) }
      } else {
        return addCorsHeaders(createSuccessResponse(
          { documents: [] },
          200,
          { requestId, message: 'No documents found' }
        ))
      }
    }

    const documents = await db.document.findMany({
      where,
      include: {
        application: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        lead: {
          select: {
            id: true,
            leadNumber: true,
            fullName: true,
            email: true,
            companyName: true,
            status: true,
          },
        },
        uploadedBy: {
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
      { documents },
      200,
      { requestId, message: 'Documents retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/documents',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch documents.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

// POST /api/documents - Upload a new document
export const POST = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const applicationId = formData.get('applicationId') as string

    if (!file) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'No file provided.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    if (!applicationId) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Application ID is required.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    // Verify user has access to this application
    const applicationData = await db.application.findUnique({
      where: { id: applicationId },
      include: {
        client: true,
      },
    })

    if (!applicationData) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Application not found.',
        404,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
      ))
    }

    // Check permissions
    if (user.role === UserRole.CLIENT) {
      const client = await db.client.findUnique({
        where: { userId: user.userId },
      })
      
      if (!client || applicationData.clientId !== client.id) {
        return addCorsHeaders(createErrorResponse(
          ErrorCodes.AUTHORIZATION_ERROR,
          'Access denied to this application.',
          403,
          { requestId }
        ))
      }
    }

    // Save file
    const { filename, path: filePath, size } = await saveUploadedFile(file, applicationId)

    // Create document record
    const document = await db.document.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: file.type,
        size,
        path: filePath,
        applicationId,
        uploadedById: user.userId,
        status: DocumentStatus.PENDING,
      },
      include: {
        application: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return addCorsHeaders(createSuccessResponse(
      { document },
      201,
      { requestId, message: 'Document uploaded successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/documents',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to upload document.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

