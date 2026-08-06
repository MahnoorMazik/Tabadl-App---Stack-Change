import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { UserRole, Prisma } from '@prisma/client'
import { z } from 'zod'
import { hashPassword, generateRandomPassword } from '@/lib/password'
import { addSoftDeleteFilter } from '@/lib/soft-delete'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

const clientSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().min(2),
  groupId: z.string().optional(),
  companyType: z.string().optional(),
  natureOfBusiness: z.string().optional(),
  designation: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  howDidYouHear: z.string().optional(),
})

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  company: z.string().min(2).optional(),
  groupId: z.string().optional().nullable(),
})

// GET /api/clients - Get all clients with their details
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  // Only staff can access this endpoint
  if (user.role !== UserRole.STAFF) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHORIZATION_ERROR,
      'Access denied. Staff role required.',
      403,
      { requestId }
    ))
  }

  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const search = searchParams.get('search')

    const where: any = {}
    if (groupId) where.groupId = groupId
    
    if (search) {
      // Sanitize search input
      const sanitizedSearch = search.replace(/['"\\]/g, '')
      where.OR = [
        { company: { contains: sanitizedSearch } },
        { user: { name: { contains: sanitizedSearch } } },
        { user: { email: { contains: sanitizedSearch } } },
      ]
    }

    const clients = await db.client.findMany({
      where: addSoftDeleteFilter(where),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            isActive: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        applications: {
          select: {
            id: true,
            applicationNumber: true,
            status: true,
            description: true,
            createdAt: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
          },
        },
        _count: {
          select: {
            applications: true,
            invoices: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return addCorsHeaders(createSuccessResponse(
      { clients },
      200,
      { requestId, message: 'Clients retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: user.userId,
      endpoint: '/api/clients',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch clients.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

// POST /api/clients - Create new client
export const POST = withAuth(async (request) => {
  const requestId = getRequestId(request)
  const user = request.user!

  if (user.role !== UserRole.STAFF) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHORIZATION_ERROR,
      'Access denied. Staff role required.',
      403,
      { requestId }
    ))
  }

  try {
    const body = await request.json()
    const data = clientSchema.parse(body)

    // Check if email already exists for a non-deleted user
    const existingUser = await db.user.findFirst({
      where: { email: data.email, isDeleted: false },
    })

    if (existingUser) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Email already exists.',
        400,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
      ))
    }

    const plainPassword = generateRandomPassword()
    const passwordHash = await hashPassword(plainPassword)

    // Create user and client in transaction
    const result = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: UserRole.CLIENT,
          emailVerified: new Date(),
        },
      })

      // Generate unique client number (handle race conditions)
      const generateClientNumber = async (): Promise<string> => {
        // Find all existing client numbers (including deleted ones) within transaction
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

        return `CT-${maxNumber + 1}`
      }

      // Generate client number with retry logic for race conditions
      let clientNumber = await generateClientNumber()
      let attempt = 0
      const maxAttempts = 5
      let newClient

      while (attempt < maxAttempts) {
        try {
          newClient = await tx.client.create({
            data: {
              clientNumber,
              name: data.name,
              email: data.email,
              phone: data.phone,
              company: data.company,
              userId: newUser.id,
              groupId: data.groupId && data.groupId.trim() !== '' ? data.groupId : undefined,
              companyType: data.companyType || null,
              natureOfBusiness: data.natureOfBusiness || null,
              designation: data.designation || null,
              country: data.country || null,
              city: data.city || null,
              howDidYouHear: data.howDidYouHear || null,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              group: true,
            },
          })
          break // Success, exit loop
        } catch (error: any) {
          // Check if it's a unique constraint error (P2002)
          // Since we're creating a client with clientNumber, any P2002 error is likely a clientNumber conflict
          const errorCode = error?.code
          const errorMessage = String(error?.message || '')
          const errorString = String(error || '')
          const target = error?.meta?.target
          
          // Check if it's P2002 error (unique constraint violation)
          // Check multiple ways the error code might be represented
          const isP2002 = errorCode === 'P2002' || 
                         error?.code === 'P2002' ||
                         errorMessage.includes('Unique constraint failed') ||
                         errorString.includes('P2002')
          
          // Check if it's related to clientNumber (check all possible locations)
          const mentionsClientNumber = 
            errorMessage.includes('clientNumber') ||
            errorString.includes('clientNumber') ||
            (Array.isArray(target) && target.includes('clientNumber')) ||
            (typeof target === 'string' && target.includes('clientNumber')) ||
            (target && String(target).includes('clientNumber'))
          
          // If it's a P2002 error and mentions clientNumber, retry
          // OR if it's P2002 and we're creating a client (likely clientNumber conflict)
          if (isP2002 && (mentionsClientNumber || attempt === 0)) {
            attempt++
            if (attempt >= maxAttempts) {
              // Max retries reached, throw the error
              throw error
            }
            // Generate new client number and retry
            clientNumber = await generateClientNumber()
            // Add small random delay to reduce collision probability
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50))
            // Continue to next iteration
            continue
          }
          // If it's not a clientNumber conflict, throw immediately
          throw error
        }
      }

      if (!newClient) {
        throw new Error('Failed to create client after multiple attempts')
      }

      return newClient
    })

    try {
      const { sendAccountCredentialsEmail } = await import('@/lib/email')
      await sendAccountCredentialsEmail(data.email, data.name, plainPassword, 'Client')
    } catch (emailError) {
      console.error('[ClientCreate] Failed to send credentials email:', emailError)
    }

    const { logCreateActivity } = await import('@/lib/activity-tracking')
    await logCreateActivity(
      { userId: user.userId },
      'Client',
      result.id,
      result.name,
      { email: data.email, company: data.company },
      request
    )

    return addCorsHeaders(createSuccessResponse(
      { client: result },
      201,
      { requestId, message: 'Client created successfully. Login credentials sent via email.' }
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
      endpoint: '/api/clients',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to create client.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})

