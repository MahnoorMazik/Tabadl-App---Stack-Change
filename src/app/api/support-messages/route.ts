import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'
import { checkRateLimit, getRateLimitIdentifier, rateLimitConfigs } from '@/lib/rate-limit'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  logError, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'
import { getSocketIO } from '@/lib/notifications'
import { processVisitorMessage } from '@/lib/chatbot/processor'

const messageSchema = z.object({
  visitorId: z.string().min(1),
  content: z.string().min(1),
  visitorName: z.string().optional(),
  visitorEmail: z.string().email().optional(),
  isFromVisitor: z.boolean().optional().default(true),
  staffId: z.string().optional(),
})

// GET /api/support-messages - Get support messages for a visitor
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const { searchParams } = new URL(request.url)
  const visitorId = searchParams.get('visitorId')
  const cursor = searchParams.get('cursor')
  const limitParam = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Math.min(Math.max(Number.isNaN(limitParam) ? 20 : limitParam, 1), 100)

  if (!visitorId) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Visitor ID is required.',
      400,
      { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
    ))
  }

  try {
    let cursorMessage: { id: string; createdAt: Date } | null = null
    if (cursor) {
      cursorMessage = await db.supportMessage.findFirst({
        where: { id: cursor, visitorId },
        select: { id: true, createdAt: true },
      })

      if (!cursorMessage) {
        return addCorsHeaders(createErrorResponse(
          ErrorCodes.NOT_FOUND_ERROR,
          'Cursor message not found.',
          404,
          { requestId, suggestion: 'Please refresh the conversation.' }
        ))
      }
    }

    const whereClause: any = {
      visitorId,
      isDeleted: false,
    }

    if (cursorMessage) {
      whereClause.OR = [
        {
          createdAt: { lt: cursorMessage.createdAt },
        },
        {
          AND: [
            { createdAt: cursorMessage.createdAt },
            { id: { lt: cursorMessage.id } },
          ],
        },
      ]
    }

    const messagesDesc = await db.supportMessage.findMany({
      where: whereClause,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit + 1,
    })

    const hasMore = messagesDesc.length > limit
    const paginated = (hasMore ? messagesDesc.slice(0, limit) : messagesDesc)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    const nextCursor = hasMore ? paginated[0]?.id ?? null : null

    return addCorsHeaders(createSuccessResponse(
      { 
        messages: paginated,
        pagination: {
          hasMore,
          nextCursor,
        },
      },
      200,
      { requestId, message: 'Support messages retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: '/api/support-messages',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to fetch support messages.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
}

// POST /api/support-messages - Send a new support message
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)
  
  // Rate limiting (by visitor ID from request body)
  try {
    const bodyClone = await request.clone().json()
    const rateLimitResult = checkRateLimit(
      `visitor:${bodyClone.visitorId || 'unknown'}`,
      rateLimitConfigs.supportMessages
    )
    if (rateLimitResult) return addCorsHeaders(rateLimitResult)
  } catch (e) {
    // Continue if body parsing fails
  }

  try {
    const body = await request.json()
    const data = messageSchema.parse(body)

    const message = await db.supportMessage.create({
      data: {
        visitorId: data.visitorId,
        content: data.content,
        visitorName: data.visitorName,
        visitorEmail: data.visitorEmail,
        isFromVisitor: data.isFromVisitor ?? true,
        staffId: data.staffId,
      },
    })

    // AI chatbot auto-reply for website visitors
    if (data.isFromVisitor !== false) {
      try {
        await processVisitorMessage(
          data.visitorId,
          data.content,
          'website',
          data.visitorName,
          data.visitorEmail
        )
      } catch (botError) {
        console.error('[SupportMessages] Chatbot processing failed:', botError)
      }
    }

    // Emit socket event for real-time updates
    try {
      const io = getSocketIO()
      if (io) {
        // Broadcast to specific visitor room
        io.to(`support-${data.visitorId}`).emit('support-message', {
          id: message.id,
          visitorId: message.visitorId,
          content: message.content,
          visitorName: message.visitorName,
          isFromVisitor: message.isFromVisitor,
          status: message.status,
          timestamp: message.createdAt,
          createdAt: message.createdAt,
        })
        
        // Also broadcast to support staff room
        io.to('support-staff').emit('support-message', {
          id: message.id,
          visitorId: message.visitorId,
          content: message.content,
          visitorName: message.visitorName,
          isFromVisitor: message.isFromVisitor,
          status: message.status,
          timestamp: message.createdAt,
          createdAt: message.createdAt,
        })
      }
    } catch (socketError) {
      // Log but don't fail the request if socket emit fails
      console.error('Failed to emit socket event:', socketError)
    }

    return addCorsHeaders(createSuccessResponse(
      { message },
      201,
      { requestId, message: 'Support message created successfully' }
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
      endpoint: '/api/support-messages',
      method: 'POST',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to create support message.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
}

