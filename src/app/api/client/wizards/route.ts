import { NextRequest } from 'next/server'
import { AreaOfInterest, UserRole } from '@prisma/client'
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
import {
  fetchMergedStepsForArea,
  mergedApplicationDisplayName,
} from '@/lib/wizards/merged-area-wizard'

export const OPTIONS = () => handleCorsPreflight()

/** GET /api/client/wizards?areaOfInterest=CR — merged flow for one service area */
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

    if (!area || !['CR', 'PR', 'GR'].includes(area)) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'areaOfInterest query (CR, PR, or GR) is required',
          400,
          { requestId }
        )
      )
    }

    const areaOfInterest = area as AreaOfInterest
    const mergedSteps = await fetchMergedStepsForArea(areaOfInterest)

    const wizardIds = new Set<string>()
    for (const step of mergedSteps) {
      wizardIds.add(step.sourceWizardId)
    }

    const merged = {
      areaOfInterest,
      title: mergedApplicationDisplayName(areaOfInterest),
      totalSteps: mergedSteps.length,
      wizardCount: wizardIds.size,
      steps: mergedSteps.map((step, index) => ({
        index: index + 1,
        id: step.id,
        formTemplateId: step.formTemplateId,
        formName: step.formTemplate.name,
        fieldCount: step.formTemplate.fields.length,
        paymentRequired: step.paymentRequired,
        sourceWizardName: step.sourceWizardName,
      })),
    }

    return addCorsHeaders(
      createSuccessResponse(
        { merged },
        200,
        { requestId, message: 'Merged application flow retrieved' }
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
