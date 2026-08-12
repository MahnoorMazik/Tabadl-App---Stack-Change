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
import { addCorsHeaders } from '@/lib/cors'
import { withFormBuilderAuth, zodErrorResponse } from '@/lib/forms/api-helpers'
import {
  formFieldSchema,
  mapFormField,
  serializeFieldOptions,
} from '@/lib/validations/forms'
import { handleCorsPreflight } from '@/lib/cors'

export const OPTIONS = () => handleCorsPreflight()

export const GET = withFormBuilderAuth(async (request) => {
  const requestId = getRequestId(request)

  try {
    const fields = await db.formField.findMany({
      orderBy: [{ updatedAt: 'desc' }],
    })

    return addCorsHeaders(
      createSuccessResponse(
        { fields: fields.map(mapFormField) },
        200,
        { requestId, message: 'Form fields retrieved successfully' }
      )
    )
  } catch (error: any) {
    logError(error, {
      code: ErrorCodes.DATABASE_ERROR,
      requestId,
      userId: request.user?.userId,
      endpoint: '/api/admin/form-fields',
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to fetch form fields',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
})

export const POST = withFormBuilderAuth(async (request) => {
  const requestId = getRequestId(request)

  try {
    const body = formFieldSchema.parse(await request.json())

    const field = await db.formField.create({
      data: {
        label: body.label,
        type: body.type,
        options: serializeFieldOptions(body.type, body.options),
        helpText: body.helpText ?? null,
        placeholder: body.placeholder ?? null,
        isActive: body.isActive ?? true,
      },
    })

    return addCorsHeaders(
      createSuccessResponse(
        { field: mapFormField(field) },
        201,
        { requestId, message: 'Form field created successfully' }
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
      endpoint: '/api/admin/form-fields',
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to create form field',
        500,
        { requestId, suggestion: getErrorSuggestion(ErrorCodes.DATABASE_ERROR) }
      )
    )
  }
})
