import { NextRequest } from 'next/server'
import { AreaOfInterest, UserRole } from '@prisma/client'
import { db } from '@/lib/db'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  getErrorSuggestion,
  getRequestId,
  logError,
} from '@/lib/error-handler'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'
import { requireAuth } from '@/lib/rbac-middleware'

export const OPTIONS = () => handleCorsPreflight()

/** GET /api/client/wizards?areaOfInterest=CR — active wizards for clients */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.AUTHENTICATION_ERROR,
          authResult.error || 'Authentication required',
          authResult.status || 401,
          {
            requestId,
            suggestion: getErrorSuggestion(ErrorCodes.AUTHENTICATION_ERROR),
          }
        )
      )
    }

    if (authResult.user.role !== UserRole.CLIENT && authResult.user.role !== UserRole.STAFF) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.AUTHORIZATION_ERROR, 'Access denied', 403, {
          requestId,
          suggestion: getErrorSuggestion(ErrorCodes.AUTHORIZATION_ERROR),
        })
      )
    }

    const { searchParams } = new URL(request.url)
    const area = searchParams.get('areaOfInterest')?.toUpperCase()

    const where: Record<string, unknown> = {
      isDeleted: false,
      isActive: true,
    }

    if (area && ['CR', 'PR', 'GR'].includes(area)) {
      where.areaOfInterest = area as AreaOfInterest
    }

    const wizards = await db.applicationWizard.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        steps: {
          orderBy: { sortOrder: 'asc' },
          include: {
            formTemplate: {
              select: {
                id: true,
                name: true,
                _count: { select: { fields: true } },
              },
            },
          },
        },
      },
    })

    const mapped = wizards.map((wizard) => ({
      id: wizard.id,
      name: wizard.name,
      areaOfInterest: wizard.areaOfInterest,
      stepCount: wizard.steps.length,
      steps: wizard.steps.map((step) => ({
        id: step.id,
        formTemplateId: step.formTemplateId,
        formName: step.formTemplate.name,
        fieldCount: step.formTemplate._count.fields,
        paymentRequired: step.paymentRequired,
        sortOrder: step.sortOrder,
      })),
    }))

    return addCorsHeaders(
      createSuccessResponse(
        { wizards: mapped },
        200,
        { requestId, message: 'Wizards retrieved successfully' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: '/api/client/wizards',
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to load wizards', 500, {
        requestId,
        suggestion: getErrorSuggestion(ErrorCodes.INTERNAL_ERROR),
      })
    )
  }
}
