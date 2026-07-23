import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export interface ErrorDetail {
  field?: string
  message: string
  value?: any
  code?: string
}

export interface StructuredError {
  success: false
  error: {
    code: ErrorCodes
    message: string
    details?: ErrorDetail[]
    timestamp: string
    requestId: string
    suggestion?: string
    context?: Record<string, any>
  }
}

export interface SuccessResponse<T = any> {
  success: true
  data: T
  timestamp: string
  requestId: string
  message?: string
}

export function createErrorResponse(
  code: ErrorCodes,
  message: string,
  status: number = 500,
  options: {
    details?: ErrorDetail[]
    suggestion?: string
    context?: Record<string, any>
    requestId?: string
  } = {}
): NextResponse<StructuredError> {
  const requestId = options.requestId || randomUUID()
  const timestamp = new Date().toISOString()

  const errorResponse: StructuredError = {
    success: false,
    error: {
      code,
      message,
      details: options.details,
      timestamp,
      requestId,
      suggestion: options.suggestion,
      context: options.context
    }
  }

  const response = NextResponse.json(errorResponse, { status })
  response.headers.set('X-Request-ID', requestId)
  response.headers.set('X-Error-Code', code)
  
  return response
}

export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  options: {
    message?: string
    requestId?: string
  } = {}
): NextResponse<SuccessResponse<T> & { meta?: { requestId: string; message?: string } }> {
  const requestId = options.requestId || randomUUID()
  const timestamp = new Date().toISOString()

  const successResponse: SuccessResponse<T> & { meta?: { requestId: string; message?: string } } = {
    success: true,
    data,
    timestamp,
    requestId,
    message: options.message,
    meta: {
      requestId,
      message: options.message
    }
  }

  const response = NextResponse.json(successResponse, { status })
  response.headers.set('X-Request-ID', requestId)
  
  return response
}

export function getRequestId(request?: Request): string {
  if (!request) {
    return randomUUID()
  }
  return request.headers.get('X-Request-ID') || randomUUID()
}

export function logError(
  error: Error,
  context: {
    code: ErrorCodes
    requestId: string
    userId?: string
    endpoint?: string
    method?: string
    additionalContext?: Record<string, any>
  }
): void {
  const logEntry = {
    level: 'error',
    timestamp: new Date().toISOString(),
    requestId: context.requestId,
    code: context.code,
    message: error.message,
    stack: error.stack,
    userId: context.userId,
    endpoint: context.endpoint,
    method: context.method,
    context: context.additionalContext
  }

  console.error('API Error:', JSON.stringify(logEntry, null, 2))
}

export function getErrorSuggestion(code: ErrorCodes): string {
  const suggestions: Partial<Record<ErrorCodes, string>> = {
    [ErrorCodes.VALIDATION_ERROR]: 'Please check your input data and try again',
    [ErrorCodes.AUTHENTICATION_ERROR]: 'Please log in again or check your credentials',
    [ErrorCodes.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action',
    [ErrorCodes.NOT_FOUND_ERROR]: 'The requested resource was not found',
    [ErrorCodes.CONFLICT_ERROR]: 'This resource already exists or conflicts with existing data',
    [ErrorCodes.DUPLICATE_RESOURCE]: 'This resource already exists. Please use different information',
    [ErrorCodes.RATE_LIMIT_ERROR]: 'Please wait a moment before making another request',
    [ErrorCodes.INTERNAL_ERROR]: 'Something went wrong on our end. Please try again later',
    [ErrorCodes.FILE_UPLOAD_ERROR]: 'Please check your file format and size, then try again',
    [ErrorCodes.DATABASE_ERROR]: 'Database operation failed. Please try again',
    [ErrorCodes.NETWORK_ERROR]: 'Network connection issue. Please check your connection'
  }

  return suggestions[code] || 'Please try again later'
}
