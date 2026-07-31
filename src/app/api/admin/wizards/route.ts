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
import { withFormBuilderAuth, zodErrorResponse } from '@/lib/forms/api-helpers'
import { applicationWizardSchema } from '@/lib/validations/wizards'
import {
  assertFormTemplatesExist,
  assertServicesExist,
  mapWizardDetail,
  prepareWizardSteps,
} from '@/lib/wizards/wizard-utils'
import { deactivateOtherWizardsInArea } from '@/lib/wizards/merged-area-wizard'

export const OPTIONS = () => handleCorsPreflight()

export const GET = withFormBuilderAuth(async (request) => {
  const requestId = getRequestId(request)

  try {
    const wizards = await db.applicationWizard.findMany({
      where: { isDeleted: false },
      orderBy: { updatedAt: 'desc' },
      include: {
        services: {
          include: {
            service: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        steps: {
          orderBy: { sortOrder: 'asc' },
          include: {
            formTemplate: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    const mapped = wizards.map((wizard) => ({
      id: wizard.id,
      name: wizard.name,
      areaOfInterest: wizard.areaOfInterest,
      isActive: wizard.isActive,
      createdAt: wizard.createdAt,
      updatedAt: wizard.updatedAt,
      serviceIds: wizard.services.map((s) => s.service.id),
      serviceNames: wizard.services.map((s) => s.service.name),
      services: wizard.services.map((s) => ({
        id: s.service.id,
        name: s.service.name,
        slug: s.service.slug,
      })),
      steps: wizard.steps.map((step) => ({
        id: step.id,
        formTemplateId: step.formTemplateId,
        formName: step.formTemplate.name,
        paymentRequired: step.paymentRequired,
        approvalRequired: step.approvalRequired,
        sortOrder: step.sortOrder,
      })),
    }))

    return addCorsHeaders(
      createSuccessResponse(
        { wizards: mapped },
        200,
        { requestId, message: 'Application wizards retrieved successfully' }
      )
    )
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: request.user?.userId,
      endpoint: '/api/admin/wizards',
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to fetch application wizards',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
})

export const POST = withFormBuilderAuth(async (request) => {
  const requestId = getRequestId(request)

  try {
    const body = applicationWizardSchema.parse(await request.json())
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
            context: { duplicateFormTemplateIds: prepared.duplicateFormTemplateIds },
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

    const uniqueServiceIds = [...new Set(body.serviceIds)]
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

    const wizard = await db.applicationWizard.create({
      data: {
        name: body.name,
        areaOfInterest: body.areaOfInterest,
        isActive: body.isActive ?? false,
        createdById: request.user!.userId,
        steps: {
          create: prepared.steps.map((step) => ({
            formTemplateId: step.formTemplateId,
            sortOrder: step.sortOrder,
            paymentRequired: step.paymentRequired,
            approvalRequired: step.approvalRequired,
            adminUseOnly: step.adminUseOnly,
          })),
        },
        services: {
          create: uniqueServiceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: {
        services: {
          include: {
            service: {
              select: { id: true, name: true, slug: true, isActive: true },
            },
          },
        },
        steps: {
          orderBy: { sortOrder: 'asc' },
          include: {
            formTemplate: {
              select: {
                id: true,
                name: true,
                areaOfInterest: true,
                isActive: true,
                isDeleted: true,
              },
            },
          },
        },
      },
    })

    if (wizard.isActive) {
      await deactivateOtherWizardsInArea(wizard.id, wizard.areaOfInterest)
    }

    return addCorsHeaders(
      createSuccessResponse(
        { wizard: mapWizardDetail(wizard) },
        201,
        { requestId, message: 'Application wizard created successfully' }
      )
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return zodErrorResponse(error, requestId)
    }

    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: request.user?.userId,
      endpoint: '/api/admin/wizards',
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to create application wizard',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
})
