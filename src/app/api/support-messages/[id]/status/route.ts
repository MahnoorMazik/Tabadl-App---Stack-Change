import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
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

const statusSchema = z.object({
  status: z.enum(['SENT', 'DELIVERED', 'READ']),
})

// PATCH /api/support-messages/[id]/status - Update support message status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)
  const { id } = await params

  try {
    const body = await request.json()
    const data = statusSchema.parse(body)

    // Check if message exists and is not deleted
    const existingMessage = await db.supportMessage.findFirst({
      where: { 
        id,
        isDeleted: false 
      }
    })

    if (!existingMessage) {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Support message not found.',
        404,
        { 
          requestId, 
          suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) 
        }
      ))
    }

    const message = await db.supportMessage.update({
      where: { id },
      data: {
        status: data.status,
      },
    })

    return addCorsHeaders(createSuccessResponse(
      { message },
      200,
      { requestId, message: 'Message status updated successfully' }
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
        { 
          requestId, 
          details, 
          suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) 
        }
      ))
    }

    // Handle Prisma errors
    if (error?.code === 'P2025') {
      return addCorsHeaders(createErrorResponse(
        ErrorCodes.NOT_FOUND_ERROR,
        'Support message not found.',
        404,
        { 
          requestId, 
          suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) 
        }
      ))
    }

    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: `/api/support-messages/${id}/status`,
      method: 'PATCH',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to update message status.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) 
      }
    ))
  }
}

