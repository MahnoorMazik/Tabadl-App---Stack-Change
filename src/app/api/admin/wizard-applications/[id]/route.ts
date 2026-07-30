import { NextRequest } from 'next/server'
import { UserRole, WizardApplicationStatus } from '@prisma/client'
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
  upsertStepAnswers,
} from '@/lib/wizards/wizard-application-utils'
import { isWizardStepInWizard } from '@/lib/wizards/merged-area-wizard'
import { setStepApproval } from '@/lib/wizards/wizard-step-approval'

type RouteContext = { params: Promise<{ id: string }> }

export const OPTIONS = () => handleCorsPreflight()

const patchSchema = z.object({
  status: z
    .enum([
      'DRAFT',
      'PENDING',
      'IN_PROGRESS',
      'HARD_COPY_REQUIRED',
      'APPROVED',
      'REJECTED',
      'COMPLETED',
    ])
    .optional(),
  adminNotes: z.string().max(5000).nullable().optional(),
  currentStepIndex: z.number().int().min(0).optional(),
  wizardStepId: z.string().min(1).optional(),
  answers: z
    .array(
      z.object({
        fieldId: z.string().min(1),
        value: z.string().nullable().optional(),
        fileUrl: z.string().nullable().optional(),
      })
    )
    .optional(),
  stepApproval: z
    .object({
      wizardStepId: z.string().min(1),
      status: z.enum(['APPROVED', 'REJECTED']),
      rejectionNote: z.string().max(2000).nullable().optional(),
    })
    .optional(),
})

/** GET /api/admin/wizard-applications/[id] */
export async function GET(request: NextRequest, context: RouteContext) {
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

    const detail = await getWizardApplicationDetail(id)
    if (!detail) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Application not found', 404, {
          requestId,
        })
      )
    }

    return addCorsHeaders(
      createSuccessResponse(
        { application: await mapWizardApplicationDetail(detail) },
        200,
        { requestId, message: 'Application retrieved' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: `GET /api/admin/wizard-applications/${id}`,
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to load application', 500, {
        requestId,
      })
    )
  }
}

/** PATCH /api/admin/wizard-applications/[id] — edit answers / status from any step */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const existing = await db.wizardApplication.findFirst({
      where: { id, isDeleted: false },
    })
    if (!existing) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Application not found', 404, {
          requestId,
        })
      )
    }

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error, requestId)
    }

    if (parsed.data.stepApproval) {
      const stepOk = await isWizardStepInWizard(
        parsed.data.stepApproval.wizardStepId,
        existing.wizardId
      )
      if (!stepOk) {
        return addCorsHeaders(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid wizard step', 400, {
            requestId,
          })
        )
      }
      await setStepApproval({
        applicationId: id,
        wizardStepId: parsed.data.stepApproval.wizardStepId,
        status: parsed.data.stepApproval.status,
        reviewedById: authResult.user.userId,
        rejectionNote: parsed.data.stepApproval.rejectionNote,
      })
    }

    if (parsed.data.wizardStepId && parsed.data.answers) {
      const stepValid = await isWizardStepInWizard(
        parsed.data.wizardStepId,
        existing.wizardId
      )
      if (!stepValid) {
        return addCorsHeaders(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid wizard step', 400, {
            requestId,
          })
        )
      }

      await upsertStepAnswers({
        applicationId: id,
        wizardStepId: parsed.data.wizardStepId,
        answers: parsed.data.answers,
        updatedById: authResult.user.userId,
        currentStepIndex: parsed.data.currentStepIndex,
      })
    }

    const data: {
      status?: WizardApplicationStatus
      submittedAt?: Date
      currentStepIndex?: number
      adminNotes?: string | null
    } = {}

    if (parsed.data.status) {
      data.status = parsed.data.status as WizardApplicationStatus
      if (
        parsed.data.status === 'PENDING' &&
        existing.status === WizardApplicationStatus.DRAFT
      ) {
        data.submittedAt = new Date()
      }
    }
    if (parsed.data.adminNotes !== undefined) {
      data.adminNotes = parsed.data.adminNotes
    }
    if (typeof parsed.data.currentStepIndex === 'number' && !parsed.data.wizardStepId) {
      data.currentStepIndex = parsed.data.currentStepIndex
    }

    if (Object.keys(data).length > 0) {
      await db.wizardApplication.update({
        where: { id },
        data,
      })
    }

    const detail = await getWizardApplicationDetail(id)
    return addCorsHeaders(
      createSuccessResponse(
        { application: await mapWizardApplicationDetail(detail!) },
        200,
        { requestId, message: 'Application updated' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: `PATCH /api/admin/wizard-applications/${id}`,
      method: 'PATCH',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update application', 500, {
        requestId,
      })
    )
  }
}
