import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
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

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissions: z.array(z.string()),
  isDefault: z.boolean().optional().default(false),
  isProtected: z.boolean().optional().default(false)
})

const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
})

// Get all roles
export const GET = withAuth(async (request: NextRequest) => {
  const requestId = getRequestId(request)
  
  try {
    const roles = await db.role.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } }
    })
    
    return addCorsHeaders(createSuccessResponse(
      { roles },
      200,
      { requestId, message: 'Roles retrieved successfully' }
    ))
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: '/api/roles',
      method: 'GET',
      additionalContext: { errorType: error.constructor.name }
    })

    return addCorsHeaders(createErrorResponse(
      ErrorCodes.DATABASE_ERROR,
      'Failed to retrieve roles.',
      500,
      { 
        requestId, 
        suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
      }
    ))
  }
})