import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac-middleware'
import { errorAnalytics } from '@/lib/error-analytics'
import { 
  createErrorResponse, 
  createSuccessResponse, 
  getRequestId, 
  ErrorCodes,
  getErrorSuggestion 
} from '@/lib/error-handler'

export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') as 'hour' | 'day' | 'week' || 'day'
    const limit = parseInt(searchParams.get('limit') || '5')

    const stats = errorAnalytics.getErrorStats(timeframe)
    const topErrors = errorAnalytics.getTopErrors(limit)
    const endpointErrors = errorAnalytics.getEndpointErrors(limit)

    return createSuccessResponse({
      timeframe,
      summary: {
        totalErrors: stats.total,
        topErrorCodes: topErrors,
        topEndpoints: endpointErrors
      },
      details: {
        byCode: stats.byCode,
        byEndpoint: stats.byEndpoint,
        recentErrors: stats.recentErrors
      }
    }, 200, { 
      requestId, 
      message: 'Error analytics retrieved successfully' 
    })
  } catch (error: any) {
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to retrieve error analytics.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.INTERNAL_ERROR)
      }
    )
  }
})

export const DELETE = withAuth(async (request) => {
  const requestId = getRequestId(request)
  
  try {
    errorAnalytics.clearErrors()
    
    return createSuccessResponse(
      { message: 'Error analytics cleared successfully' },
      200,
      { requestId, message: 'Analytics cleared' }
    )
  } catch (error: any) {
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to clear error analytics.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.INTERNAL_ERROR)
      }
    )
  }
})
