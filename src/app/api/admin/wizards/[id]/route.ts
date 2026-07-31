import { NextRequest } from 'next/server'
import { z } from 'zod'
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
import {
  authErrorResponse,
  requireFormBuilderAuth,
  zodErrorResponse,
} from '@/lib/forms/api-helpers'
import { applicationWizardUpdateSchema } from '@/lib/validations/wizards'
import {
  assertFormTemplatesExist,
  assertServicesExist,
  getWizardDetail,
  mapWizardDetail,
  prepareWizardSteps,
  replaceWizardRelations,
} from '@/lib/wizards/wizard-utils'

type RouteContext = { params: Promise<{ id: string }> }

export const OPTIONS = () => handleCorsPreflight()

export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request)
  const { id } = await context.params

  try {
    const authResult = await requireFormBuilderAuth(request)
    if ('error' in authResult) {
      return authErrorResponse(authResult, requestId)
    }

    const wizard = await getWizardDetail(id)
    if (!wizard) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.NOT_FOUND_ERROR,
          'Application wizard not found',
          404,
          { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
        )
      )
    }

    return addCorsHeaders(
      createSuccessResponse(
        { wizard: mapWizardDetail(wizard) },
        200,
        { requestId, message: 'Application wizard retrieved successfully' }
      )
    )
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: `/api/admin/wizards/${id}`,
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to fetch application wizard',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request)
  const { id } = await context.params

  try {
    const authResult = await requireFormBuilderAuth(request)
    if ('error' in authResult) {
      return authErrorResponse(authResult, requestId)
    }

    const existing = await db.applicationWizard.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    })
    if (!existing) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.NOT_FOUND_ERROR,
          'Application wizard not found',
          404,
          { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
        )
      )
    }

    const body = applicationWizardUpdateSchema.parse(await request.json())

    if (
      body.name === undefined &&
      body.areaOfInterest === undefined &&
      body.isActive === undefined &&
      body.serviceIds === undefined &&
      body.steps === undefined
    ) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'At least one field must be provided',
          400,
          { requestId, suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR) }
        )
      )
    }

    let normalizedSteps:
      | Array<{
          formTemplateId: string
          sortOrder: number
          paymentRequired: boolean
          approvalRequired: boolean
          adminUseOnly: boolean
        }>
      | undefined

    if (body.steps) {
      const prepared = prepareWizardSteps(body.steps)
      if (!prepared.ok) {
        return addCorsHeaders(
          createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'Duplicate form templates are not allowed in a wizard',
            400,
            {
              requestId,
              suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR),
              context: {
                duplicateFormTemplateIds: prepared.duplicateFormTemplateIds,
              },
            }
          )
        )
      }

      const templatesCheck = await assertFormTemplatesExist(
        prepared.steps.map((s) => s.formTemplateId)
      )
      if (!templatesCheck.ok) {
        return addCorsHeaders(
          createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'One or more form templates do not exist or are inactive',
            400,
            {
              requestId,
              suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR),
              context: { missingFormTemplateIds: templatesCheck.missing },
            }
          )
        )
      }

      normalizedSteps = prepared.steps
    }

    let uniqueServiceIds: string[] | undefined
    if (body.serviceIds) {
      uniqueServiceIds = [...new Set(body.serviceIds)]
      const servicesCheck = await assertServicesExist(uniqueServiceIds)
      if (!servicesCheck.ok) {
        return addCorsHeaders(
          createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            'One or more services do not exist or are inactive',
            400,
            {
              requestId,
              suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR),
              context: { missingServiceIds: servicesCheck.missing },
            }
          )
        )
      }
    }

    await replaceWizardRelations(id, {
      name: body.name,
      areaOfInterest: body.areaOfInterest,
      isActive: body.isActive,
      serviceIds: uniqueServiceIds,
      steps: normalizedSteps,
    })

    const wizard = await getWizardDetail(id)

    return addCorsHeaders(
      createSuccessResponse(
        { wizard: wizard ? mapWizardDetail(wizard) : null },
        200,
        { requestId, message: 'Application wizard updated successfully' }
      )
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return zodErrorResponse(error, requestId)
    }

    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: `/api/admin/wizards/${id}`,
      method: 'PATCH',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to update application wizard',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request)
  const { id } = await context.params

  try {
    const authResult = await requireFormBuilderAuth(request)
    if ('error' in authResult) {
      return authErrorResponse(authResult, requestId)
    }

    const existing = await db.applicationWizard.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    })
    if (!existing) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.NOT_FOUND_ERROR,
          'Application wizard not found',
          404,
          { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
        )
      )
    }

    await db.applicationWizard.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    })

    return addCorsHeaders(
      createSuccessResponse(
        { id },
        200,
        { requestId, message: 'Application wizard deleted successfully' }
      )
    )
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: `/api/admin/wizards/${id}`,
      method: 'DELETE',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to delete application wizard',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
}
