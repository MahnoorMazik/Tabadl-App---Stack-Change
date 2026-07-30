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
import {
  formTemplateSchema,
  mapFormField,
} from '@/lib/validations/forms'
import {
  assertFieldsExist,
  assertServicesAvailable,
  assertServicesExist,
  prepareTemplateFields,
} from '@/lib/forms/template-utils'

export const OPTIONS = () => handleCorsPreflight()

export const GET = withFormBuilderAuth(async (request) => {
  const requestId = getRequestId(request)

  try {
    const templates = await db.formTemplate.findMany({
      where: { isDeleted: false },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { fields: true } },
        services: {
          include: {
            service: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    })

    const mapped = templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      areaOfInterest: t.areaOfInterest,
      isActive: t.isActive,
      fieldCount: t._count.fields,
      updatedAt: t.updatedAt,
      createdAt: t.createdAt,
      services: t.services.map((s) => ({
        id: s.service.id,
        name: s.service.name,
        slug: s.service.slug,
      })),
    }))

    return addCorsHeaders(
      createSuccessResponse(
        { templates: mapped },
        200,
        { requestId, message: 'Form templates retrieved successfully' }
      )
    )
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: request.user?.userId,
      endpoint: '/api/admin/form-templates',
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to fetch form templates',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
})

export const POST = withFormBuilderAuth(async (request) => {
  const requestId = getRequestId(request)

  try {
    const body = formTemplateSchema.parse(await request.json())
    const prepared = prepareTemplateFields(body.fieldIds)

    if (!prepared.ok) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Duplicate fieldIds are not allowed',
          400,
          {
            requestId,
            suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR),
            context: { duplicateFieldIds: prepared.duplicateFieldIds },
          }
        )
      )
    }

    const fieldsCheck = await assertFieldsExist(prepared.fields.map((f) => f.fieldId))
    if (!fieldsCheck.ok) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'One or more fields do not exist',
          400,
          {
            requestId,
            suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR),
            context: { missingFieldIds: fieldsCheck.missing },
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

    const availability = await assertServicesAvailable(uniqueServiceIds)
    if (!availability.ok) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.CONFLICT_ERROR,
          'One or more services are already assigned to another form template',
          409,
          {
            requestId,
            suggestion: getErrorSuggestion(ErrorCodes.CONFLICT_ERROR),
            context: {
              conflicts: availability.conflicts.map((c) => ({
                serviceId: c.service.id,
                serviceName: c.service.name,
                templateId: c.template.id,
                templateName: c.template.name,
              })),
            },
          }
        )
      )
    }

    const template = await db.$transaction(async (tx) => {
      const created = await tx.formTemplate.create({
        data: {
          name: body.name,
          description: body.description ?? null,
          areaOfInterest: body.areaOfInterest,
          isActive: body.isActive ?? true,
          createdById: request.user!.userId,
          fields: {
            create: prepared.fields.map((f) => ({
              fieldId: f.fieldId,
              sortOrder: f.sortOrder,
              isRequired: f.isRequired,
              labelOverride: f.labelOverride,
            })),
          },
          services: {
            create: uniqueServiceIds.map((serviceId) => ({ serviceId })),
          },
        },
        include: {
          _count: { select: { fields: true } },
          services: {
            include: {
              service: { select: { id: true, name: true, slug: true } },
            },
          },
          fields: {
            orderBy: { sortOrder: 'asc' },
            include: { field: true },
          },
        },
      })
      return created
    })

    return addCorsHeaders(
      createSuccessResponse(
        {
          template: {
            id: template.id,
            name: template.name,
            description: template.description,
            areaOfInterest: template.areaOfInterest,
            isActive: template.isActive,
            fieldCount: template._count.fields,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            services: template.services.map((s) => ({
              id: s.service.id,
              name: s.service.name,
              slug: s.service.slug,
            })),
            fields: template.fields.map((tf) => ({
              id: tf.id,
              fieldId: tf.fieldId,
              sortOrder: tf.sortOrder,
              isRequired: tf.isRequired,
              labelOverride: tf.labelOverride,
              field: mapFormField(tf.field),
            })),
          },
        },
        201,
        { requestId, message: 'Form template created successfully' }
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
      endpoint: '/api/admin/form-templates',
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to create form template',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
})
