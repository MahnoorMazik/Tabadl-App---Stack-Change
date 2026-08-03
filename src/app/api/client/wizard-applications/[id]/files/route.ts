import { NextRequest } from 'next/server'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  getRequestId,
  logError,
} from '@/lib/error-handler'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'
import { requireAuth } from '@/lib/rbac-middleware'
import { ensureClientAccess } from '@/lib/wizards/wizard-application-utils'
import { db } from '@/lib/db'
import { saveWizardApplicationFile } from '@/lib/wizards/wizard-file-upload'

type RouteContext = { params: Promise<{ id: string }> }

export const OPTIONS = () => handleCorsPreflight()

/** POST /api/client/wizard-applications/[id]/files */
export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request)
  const { id } = await context.params

  try {
    const authResult = await requireAuth(request)
    if ('error' in authResult) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.AUTHENTICATION_ERROR, authResult.error, authResult.status, {
          requestId,
        })
      )
    }

    const access = await ensureClientAccess(authResult.user)
    if ('error' in access) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.FORBIDDEN, access.error, access.status, { requestId })
      )
    }

    const app = await db.wizardApplication.findFirst({
      where: { id, clientId: access.client.id, isDeleted: false },
      select: { id: true },
    })
    if (!app) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Application not found', 404, { requestId })
      )
    }

    const formData = await request.formData()
    const raw = formData.get('file')
    const file =
      raw instanceof File
        ? raw
        : raw instanceof Blob
          ? new File([raw], (raw as File).name || 'upload.bin', {
              type: raw.type || 'application/octet-stream',
            })
          : null
    if (!file || file.size <= 0) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'No file provided', 400, {
          requestId,
        })
      )
    }

    const result = await saveWizardApplicationFile({ applicationId: id, file })
    if (!result.ok) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, result.message, 400, { requestId })
      )
    }

    return addCorsHeaders(
      createSuccessResponse({ file: result.data }, 200, { requestId })
    )
  } catch (error) {
    logError(error, { requestId, route: 'POST /api/client/wizard-applications/[id]/files' })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to upload file', 500, {
        requestId,
      })
    )
  }
}
