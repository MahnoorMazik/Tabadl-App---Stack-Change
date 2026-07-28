import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import {
  AuthenticatedRequest,
  requireAuth,
  withAuth,
} from '@/lib/rbac-middleware'
import {
  createErrorResponse,
  ErrorCodes,
  getErrorSuggestion,
  getRequestId,
} from '@/lib/error-handler'
import { addCorsHeaders } from '@/lib/cors'

type AuthenticatedHandler = (req: AuthenticatedRequest) => Promise<NextResponse>

function isStaffOrAdmin(role?: UserRole) {
  return role === UserRole.STAFF || role === UserRole.ADMIN
}

/** Admin Form Builder APIs — STAFF and ADMIN only (wraps withAuth) */
export function withFormBuilderAuth(handler: AuthenticatedHandler) {
  return withAuth(async (req: AuthenticatedRequest) => {
    const requestId = getRequestId(req)

    if (!isStaffOrAdmin(req.user?.role)) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.AUTHORIZATION_ERROR,
          'Forbidden: Admin Form Builder is restricted to STAFF and ADMIN roles',
          403,
          {
            requestId,
            suggestion: getErrorSuggestion(ErrorCodes.AUTHORIZATION_ERROR),
          }
        )
      )
    }

    return handler(req)
  })
}

/** For dynamic routes that need `params` as a second argument */
export async function requireFormBuilderAuth(request: NextRequest): Promise<
  | { error: string; status: number }
  | {
      user: {
        userId: string
        email: string
        role: UserRole
        staffType: import('@prisma/client').StaffType | null
        name: string | null
        permissions: import('@/lib/rbac').Permission[]
      }
    }
> {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return { error: authResult.error, status: authResult.status }
  }

  if (!isStaffOrAdmin(authResult.user.role)) {
    return {
      error: 'Forbidden: Admin Form Builder is restricted to STAFF and ADMIN roles',
      status: 403,
    }
  }

  return { user: authResult.user }
}

export function zodErrorResponse(error: z.ZodError, requestId: string) {
  return addCorsHeaders(
    createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'Validation failed',
      400,
      {
        requestId,
        suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR),
        details: error.issues.map((issue) => ({
          field: issue.path.length ? issue.path.map(String).join('.') : undefined,
          message: issue.message,
        })),
      }
    )
  )
}

export function authErrorResponse(
  authResult: { error: string; status: number },
  requestId: string
) {
  const code =
    authResult.status === 401
      ? ErrorCodes.AUTHENTICATION_ERROR
      : ErrorCodes.AUTHORIZATION_ERROR

  return addCorsHeaders(
    createErrorResponse(code, authResult.error, authResult.status, {
      requestId,
      suggestion: getErrorSuggestion(code),
    })
  )
}
