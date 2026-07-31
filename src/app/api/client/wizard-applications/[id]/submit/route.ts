import { NextRequest } from 'next/server'
import { WizardApplicationStatus } from '@prisma/client'
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
  ensureClientAccess,
  getWizardApplicationDetail,
  mapWizardApplicationDetail,
  upsertStepAnswers,
} from '@/lib/wizards/wizard-application-utils'
import { isWizardStepInWizard } from '@/lib/wizards/merged-area-wizard'
import {
  assertAllRequiredApprovalsForSubmit,
  assertClientMayEditStepAnswers,
  syncStepReviewAfterClientSave,
} from '@/lib/wizards/wizard-step-approval'
// ✅ FIXED IMPORT PATH
import { sendApplicationStatusEmail } from '@/lib/email/application-email-service'

type RouteContext = { params: Promise<{ id: string }> }

export const OPTIONS = () => handleCorsPreflight()

const submitBodySchema = z.object({
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
})

/** POST /api/client/wizard-applications/[id]/submit */
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

    const access = await ensureClientAccess({
      userId: authResult.user.userId,
      role: String(authResult.user.role),
      email: authResult.user.email,
      name: authResult.user.name,
    })
    if ('error' in access) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.AUTHORIZATION_ERROR, access.error, access.status, {
          requestId,
        })
      )
    }

    const app = await db.wizardApplication.findFirst({
      where: { id, clientId: access.client.id, isDeleted: false },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    })

    if (!app) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Application not found', 404, {
          requestId,
        })
      )
    }

    if (app.status !== WizardApplicationStatus.DRAFT) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Application already submitted', 400, {
          requestId,
        })
      )
    }

    let body: unknown = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const parsedBody = submitBodySchema.safeParse(body)
    if (!parsedBody.success) {
      return zodErrorResponse(parsedBody.error, requestId)
    }

    if (
      parsedBody.data.wizardStepId &&
      parsedBody.data.answers &&
      parsedBody.data.answers.length > 0
    ) {
      const stepValid = await isWizardStepInWizard(
        parsedBody.data.wizardStepId,
        app.wizardId
      )
      if (!stepValid) {
        return addCorsHeaders(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid wizard step', 400, {
            requestId,
          })
        )
      }

      const wizardStep = await db.applicationWizardStep.findFirst({
        where: { id: parsedBody.data.wizardStepId },
        select: { approvalRequired: true },
      })

      const editCheck = await assertClientMayEditStepAnswers({
        applicationId: id,
        wizardStepId: parsedBody.data.wizardStepId,
        approvalRequired: wizardStep?.approvalRequired ?? false,
      })
      if (!editCheck.ok) {
        return addCorsHeaders(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, editCheck.message, 400, {
            requestId,
          })
        )
      }

      await upsertStepAnswers({
        applicationId: id,
        wizardStepId: parsedBody.data.wizardStepId,
        answers: parsedBody.data.answers,
        updatedById: authResult.user.userId,
      })

      await syncStepReviewAfterClientSave({
        applicationId: id,
        wizardStepId: parsedBody.data.wizardStepId,
        approvalRequired: wizardStep?.approvalRequired ?? false,
        answers: parsedBody.data.answers,
      })
    }

    const approvalCheck = await assertAllRequiredApprovalsForSubmit({
      applicationId: id,
    })
    if (!approvalCheck.ok) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, approvalCheck.message, 400, {
          requestId,
        })
      )
    }

    const appWithWizard = await db.wizardApplication.findFirst({
      where: { id, clientId: access.client.id, isDeleted: false },
      select: {
        wizard: { select: { steps: { select: { id: true } } } },
      },
    })
    const totalSteps = appWithWizard?.wizard.steps.length ?? 0

    const updatedApp = await db.wizardApplication.update({
      where: { id },
      data: {
        status: WizardApplicationStatus.PENDING,
        submittedAt: new Date(),
        currentStepIndex: Math.max(0, totalSteps - 1),
      },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    })

    // ✅ SEND SUBMISSION EMAIL
    let emailResult = { success: false, error: 'No email sent' }
    
    if (updatedApp.client?.email) {
      try {
        // ✅ FIXED: Store result properly
        const result = await sendApplicationStatusEmail({
          applicationId: updatedApp.id,
          applicationNumber: updatedApp.applicationNumber,
          status: 'SUBMITTED',
          recipientEmail: updatedApp.client.email,
          serviceName: updatedApp.areaOfInterest,
        })
        
        // ✅ FIXED: Handle the result correctly
        emailResult = {
          success: result.success,
          error: result.error || 'Unknown error',
        }
        
        console.log('✅ Submission email sent to:', updatedApp.client.email)
      } catch (emailError) {
        console.error('❌ Failed to send submission email:', emailError)
        emailResult = {
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        }
      }
    }

    const detail = await getWizardApplicationDetail(id)
    return addCorsHeaders(
      createSuccessResponse(
        { 
          application: await mapWizardApplicationDetail(detail!),
          emailSent: emailResult.success,
        },
        200,
        { requestId, message: 'Application submitted — status is now Pending' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: `POST /api/client/wizard-applications/${id}/submit`,
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to submit application', 500, {
        requestId,
      })
    )
  }
}