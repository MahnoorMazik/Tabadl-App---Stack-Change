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
import { formTemplateUpdateSchema, mapFormField } from '@/lib/validations/forms'
import {
  assertFieldsExist,
  assertServicesAvailable,
  assertServicesExist,
  getTemplateDetail,
  prepareTemplateFields,
  replaceTemplateRelations,
} from '@/lib/forms/template-utils'

type RouteContext = { params: Promise<{ id: string }> }

export const OPTIONS = () => handleCorsPreflight()

function mapTemplateDetail(template: NonNullable<Awaited<ReturnType<typeof getTemplateDetail>>>) {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    areaOfInterest: template.areaOfInterest,
    isActive: template.isActive,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    createdBy: template.createdBy,
    fields: template.fields.map((tf) => ({
      id: tf.id,
      fieldId: tf.fieldId,
      sortOrder: tf.sortOrder,
      isRequired: tf.isRequired,
      labelOverride: tf.labelOverride,
      field: mapFormField(tf.field),
    })),
    services: template.services.map((s) => ({
      id: s.service.id,
      name: s.service.name,
      slug: s.service.slug,
      isActive: s.service.isActive,
    })),
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request)
  const { id } = await context.params

  try {
    const authResult = await requireFormBuilderAuth(request)
    if ('error' in authResult) {
      return authErrorResponse(authResult, requestId)
    }

    const template = await getTemplateDetail(id)
    if (!template) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.NOT_FOUND_ERROR,
          'Form template not found',
          404,
          { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
        )
      )
    }

    return addCorsHeaders(
      createSuccessResponse(
        { template: mapTemplateDetail(template) },
        200,
        { requestId, message: 'Form template retrieved successfully' }
      )
    )
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: `/api/admin/form-templates/${id}`,
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to fetch form template',
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

    const existing = await db.formTemplate.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    })
    if (!existing) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.NOT_FOUND_ERROR,
          'Form template not found',
          404,
          { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
        )
      )
    }

    const body = formTemplateUpdateSchema.parse(await request.json())

    if (
      body.name === undefined &&
      body.description === undefined &&
      body.areaOfInterest === undefined &&
      body.isActive === undefined &&
      body.fieldIds === undefined &&
      body.serviceIds === undefined
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

    let normalizedFields:
      | Array<{
          fieldId: string
          sortOrder: number
          isRequired: boolean
          labelOverride: string | null
        }>
      | undefined

    if (body.fieldIds) {
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

      normalizedFields = prepared.fields.map((f) => ({
        fieldId: f.fieldId,
        sortOrder: f.sortOrder,
        isRequired: f.isRequired ?? false,
        labelOverride: f.labelOverride ?? null,
      }))
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

      const availability = await assertServicesAvailable(uniqueServiceIds, id)
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
    }

    await replaceTemplateRelations(id, {
      name: body.name,
      description: body.description,
      areaOfInterest: body.areaOfInterest,
      isActive: body.isActive,
      fields: normalizedFields,
      serviceIds: uniqueServiceIds,
    })

    const template = await getTemplateDetail(id)

    return addCorsHeaders(
      createSuccessResponse(
        { template: template ? mapTemplateDetail(template) : null },
        200,
        { requestId, message: 'Form template updated successfully' }
      )
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return zodErrorResponse(error, requestId)
    }

    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: `/api/admin/form-templates/${id}`,
      method: 'PATCH',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to update form template',
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

    const existing = await db.formTemplate.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    })
    if (!existing) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.NOT_FOUND_ERROR,
          'Form template not found',
          404,
          { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
        )
      )
    }

    await db.$transaction(async (tx) => {
      await tx.formTemplateService.deleteMany({ where: { templateId: id } })
      await tx.formTemplate.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false,
        },
      })
    })

    return addCorsHeaders(
      createSuccessResponse(
        { id },
        200,
        { requestId, message: 'Form template deleted successfully' }
      )
    )
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: `/api/admin/form-templates/${id}`,
      method: 'DELETE',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to delete form template',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
}
