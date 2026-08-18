import { NextRequest } from 'next/server'
import { UserRole, StaffType } from '@prisma/client'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  getRequestId,
  logError,
} from '@/lib/error-handler'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'
import { requireAuth } from '@/lib/rbac-middleware'
import { db } from '@/lib/db'
import { saveWizardApplicationFile } from '@/lib/wizards/wizard-file-upload'

type RouteContext = { params: Promise<{ id: string }> }

export const OPTIONS = () => handleCorsPreflight()

/** POST /api/admin/wizard-applications/[id]/files */
export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request)
  const { id } = await context.params

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
        })
      )
    }

    const isAdmin =
      authResult.user.role === UserRole.STAFF &&
      authResult.user.staffType === StaffType.ADMIN
    if (!isAdmin) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.FORBIDDEN, 'Admin access required', 403, {
          requestId,
        })
      )
    }

    const app = await db.wizardApplication.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    })
    if (!app) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Application not found', 404, {
          requestId,
        })
      )
    }

    const formData = await request.formData()
    const raw = formData.get('file')
    if (!(raw instanceof File) || raw.size <= 0) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'No file provided', 400, {
          requestId,
        })
      )
    }
    const file = raw

    const result = await saveWizardApplicationFile({ applicationId: id, file })
    if (!result.ok) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, result.message, 400, {
          requestId,
        })
      )
    }

    return addCorsHeaders(
      createSuccessResponse(
        {
          file: result.data,
          fileUrl: result.data.url,
          originalName: result.data.originalName,
        },
        200,
        { requestId }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: 'POST /api/admin/wizard-applications/[id]/files',
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to upload file', 500, {
        requestId,
      })
    )
  }
}
