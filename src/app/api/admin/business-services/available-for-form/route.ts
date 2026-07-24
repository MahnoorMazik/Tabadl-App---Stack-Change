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
import { withFormBuilderAuth } from '@/lib/forms/api-helpers'

export const OPTIONS = () => handleCorsPreflight()

/**
 * GET /api/admin/business-services/available-for-form
 * Optional query: excludeTemplateId
 *
 * Returns active business services with assignment status for form templates.
 * Services assigned to excludeTemplateId are treated as not already assigned.
 */
export const GET = withFormBuilderAuth(async (request) => {
  const requestId = getRequestId(request)

  try {
    const { searchParams } = new URL(request.url)
    const excludeTemplateId = searchParams.get('excludeTemplateId') || undefined

    const [services, assignments] = await Promise.all([
      db.businessService.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          category: { select: { id: true, name: true } },
        },
      }),
      db.formTemplateService.findMany({
        where: {
          template: { isDeleted: false },
        },
        include: {
          template: {
            select: { id: true, name: true },
          },
        },
      }),
    ])

    const assignmentByService = new Map(
      assignments.map((a) => [
        a.serviceId,
        { templateId: a.template.id, templateName: a.template.name },
      ])
    )

    const mapped = services.map((service) => {
      const assignment = assignmentByService.get(service.id)
      const belongsToExcluded =
        Boolean(excludeTemplateId) && assignment?.templateId === excludeTemplateId

      const alreadyAssigned = Boolean(assignment) && !belongsToExcluded

      return {
        id: service.id,
        name: service.name,
        slug: service.slug,
        category: service.category,
        alreadyAssigned,
        assignedTemplateId: alreadyAssigned ? assignment!.templateId : null,
        assignedTemplateName: alreadyAssigned ? assignment!.templateName : null,
      }
    })

    return addCorsHeaders(
      createSuccessResponse(
        { services: mapped },
        200,
        { requestId, message: 'Available services retrieved successfully' }
      )
    )
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: request.user?.userId,
      endpoint: '/api/admin/business-services/available-for-form',
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to fetch available services',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
})
