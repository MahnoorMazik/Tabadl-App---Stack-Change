import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  createErrorResponse,
  createSuccessResponse,
  ErrorCodes,
  getRequestId,
  logError,
} from '@/lib/error-handler'
import { addCorsHeaders, handleCorsPreflight } from '@/lib/cors'
import { requireAuth } from '@/lib/rbac-middleware'
import { zodErrorResponse } from '@/lib/forms/api-helpers'
import {
  getWizardApplicationDetail,
  mapWizardApplicationDetail,
} from '@/lib/wizards/wizard-application-utils'

type RouteContext = { params: Promise<{ id: string }> }

export const OPTIONS = () => handleCorsPreflight()

const addStepSchema = z.object({
  formTemplateId: z.string().min(1),
  paymentRequired: z.boolean().optional().default(false),
  approvalRequired: z.boolean().optional().default(false),
})

/** POST — append a form step to this application's wizard (next step) */
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
          { requestId }
        )
      )
    }

    if (authResult.user.role !== UserRole.STAFF && authResult.user.role !== UserRole.ADMIN) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.AUTHORIZATION_ERROR, 'Staff access required', 403, {
          requestId,
        })
      )
    }

    const app = await db.wizardApplication.findFirst({
      where: { id, isDeleted: false },
      include: {
        wizard: {
          include: {
            steps: { orderBy: { sortOrder: 'desc' }, take: 1 },
          },
        },
      },
    })

    if (!app) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Application not found', 404, {
          requestId,
        })
      )
    }

    const body = await request.json()
    const parsed = addStepSchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error, requestId)
    }

    const template = await db.formTemplate.findFirst({
      where: {
        id: parsed.data.formTemplateId,
        isDeleted: false,
        isActive: true,
      },
    })
    if (!template) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Form template not found', 404, {
          requestId,
        })
      )
    }

    const already = await db.applicationWizardStep.findFirst({
      where: {
        wizardId: app.wizardId,
        formTemplateId: parsed.data.formTemplateId,
      },
    })
    if (already) {
      return addCorsHeaders(
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'This form is already a step in the wizard',
          400,
          { requestId }
        )
      )
    }

    const nextOrder = (app.wizard.steps[0]?.sortOrder ?? -1) + 1

    await db.applicationWizardStep.create({
      data: {
        wizardId: app.wizardId,
        formTemplateId: parsed.data.formTemplateId,
        paymentRequired: parsed.data.paymentRequired ?? false,
        approvalRequired: parsed.data.approvalRequired ?? false,
        sortOrder: nextOrder,
      },
    })

    const detail = await getWizardApplicationDetail(id)
    return addCorsHeaders(
      createSuccessResponse(
        { application: await mapWizardApplicationDetail(detail!) },
        201,
        { requestId, message: 'Step added' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: `POST /api/admin/wizard-applications/${id}/steps`,
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to add step', 500, {
        requestId,
      })
    )
  }
}
