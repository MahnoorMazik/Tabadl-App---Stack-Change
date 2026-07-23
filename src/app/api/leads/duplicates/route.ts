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

// GET /api/leads/duplicates - Get all duplicate groups
export const GET = withAuth(async (request) => {
  const requestId = getRequestId(request)
  if (!request.user) {
    return addCorsHeaders(createErrorResponse(
      ErrorCodes.AUTHENTICATION_ERROR,
      'User not authenticated',
      401,
      { requestId }
    ))
  }
  const user = request.user
  
  try {
    // Get all leads that have duplicates (duplicateCount > 1) and are not deleted
    const duplicateLeads = await db.lead.findMany({
      where: {
        isDeleted: false, // Only check non-deleted leads
        duplicateCount: {
          gt: 1
        }
      },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { duplicateGroupId: 'asc' },
          { createdAt: 'asc' }
        ]
      })

      // Group leads by duplicateGroupId
      const duplicateGroups = duplicateLeads.reduce((groups, lead) => {
        const groupId = lead.duplicateGroupId || lead.id
        if (!groups[groupId]) {
          groups[groupId] = []
        }
        groups[groupId].push(lead)
        return groups
      }, {} as Record<string, any[]>)

      // Convert to array format
      const groupedDuplicates = Object.values(duplicateGroups).map(group => ({
        groupId: group[0].duplicateGroupId || group[0].id,
        email: group[0].email,
        totalCount: group[0].duplicateCount,
        leads: group
      }))

      return addCorsHeaders(createSuccessResponse(
        {
          duplicateGroups: groupedDuplicates,
          totalGroups: groupedDuplicates.length,
          totalLeads: duplicateLeads.length
        },
        200,
        { requestId, message: 'Duplicate groups retrieved successfully' }
      ))
    } catch (error: any) {
      logError(error, {
        code: ErrorCodes.DATABASE_ERROR,
        requestId,
        userId: user.userId,
        endpoint: '/api/leads/duplicates',
        method: 'GET',
        additionalContext: { errorType: error.constructor.name }
      })

      return addCorsHeaders(createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to fetch duplicate groups.',
        500,
        { 
          requestId, 
          suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR)
        }
      ))
    }
})
