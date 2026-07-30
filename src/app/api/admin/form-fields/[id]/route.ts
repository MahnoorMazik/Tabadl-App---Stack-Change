import { NextRequest } from 'next/server'
import { z } from 'zod'
import { FormFieldType } from '@prisma/client'
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
import {
  formFieldUpdateSchema,
  mapFormField,
  parseFieldOptions,
  serializeFieldOptions,
} from '@/lib/validations/forms'

type RouteContext = { params: Promise<{ id: string }> }

export const OPTIONS = () => handleCorsPreflight()

export async function PATCH(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request)
  const { id } = await context.params

  try {
    const authResult = await requireFormBuilderAuth(request)
    if ('error' in authResult) {
      return authErrorResponse(authResult, requestId)
    }

    const existing = await db.formField.findUnique({ where: { id } })
    if (!existing) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.NOT_FOUND_ERROR,
          'Form field not found',
          404,
          { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
        )
      )
    }

    const body = formFieldUpdateSchema.parse(await request.json())
    const nextType = (body.type ?? existing.type) as FormFieldType

    let nextOptions: string[] | null | undefined = body.options
    if (body.options === undefined && (nextType === 'SELECT' || nextType === 'RADIO')) {
      nextOptions = parseFieldOptions(existing.options) ?? []
    }

    if (nextType === 'SELECT' || nextType === 'RADIO') {
      if (!nextOptions || nextOptions.length === 0) {
        return addCorsHeaders(
          createErrorResponse(
            ErrorCodes.VALIDATION_ERROR,
            `${nextType} fields must contain at least one option`,
            400,
            {
              requestId,
              suggestion: getErrorSuggestion(ErrorCodes.VALIDATION_ERROR),
              details: [{ field: 'options', message: 'At least one option is required' }],
            }
          )
        )
      }
    }

    const field = await db.formField.update({
      where: { id },
      data: {
        ...(body.label !== undefined ? { label: body.label } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.helpText !== undefined ? { helpText: body.helpText } : {}),
        ...(body.placeholder !== undefined ? { placeholder: body.placeholder } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        options: serializeFieldOptions(nextType, nextOptions),
      },
    })

    return addCorsHeaders(
      createSuccessResponse(
        { field: mapFormField(field) },
        200,
        { requestId, message: 'Form field updated successfully' }
      )
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return zodErrorResponse(error, requestId)
    }

    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: `/api/admin/form-fields/${id}`,
      method: 'PATCH',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to update form field',
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

    const existing = await db.formField.findUnique({ where: { id } })
    if (!existing) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.NOT_FOUND_ERROR,
          'Form field not found',
          404,
          { requestId, suggestion: getErrorSuggestion(ErrorCodes.NOT_FOUND_ERROR) }
        )
      )
    }

    const usages = await db.formTemplateField.findMany({
      where: {
        fieldId: id,
        template: { isDeleted: false },
      },
      include: {
        template: {
          select: { id: true, name: true },
        },
      },
    })

    if (usages.length > 0) {
      const templates = Array.from(
        new Map(
          usages.map((u) => [u.template.id, { id: u.template.id, name: u.template.name }])
        ).values()
      )

      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.CONFLICT_ERROR,
          'Cannot delete form field that is used by one or more templates',
          409,
          {
            requestId,
            suggestion: 'Remove the field from all templates before deleting it',
            context: { templates },
          }
        )
      )
    }

    await db.formField.delete({ where: { id } })

    return addCorsHeaders(
      createSuccessResponse(
        { id },
        200,
        { requestId, message: 'Form field deleted successfully' }
      )
    )
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      endpoint: `/api/admin/form-fields/${id}`,
      method: 'DELETE',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to delete form field',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
}
