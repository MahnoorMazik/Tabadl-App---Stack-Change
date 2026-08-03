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
  assertClientMayEditStepAnswers,
  syncStepReviewAfterClientSave,
  assertClientStepIndexAllowed,
} from '@/lib/wizards/wizard-step-approval'
import { sendApplicationStatusEmail } from '@/lib/email/application-email-service'

type RouteContext = { params: Promise<{ id: string }> }

export const OPTIONS = () => handleCorsPreflight()

const answersSchema = z.object({
  wizardStepId: z.string().min(1),
  currentStepIndex: z.number().int().min(0).optional(),
  answers: z.array(
    z.object({
      fieldId: z.string().min(1),
      value: z.string().nullable().optional(),
      fileUrl: z.string().nullable().optional(),
    })
  ),
})

const statusUpdateSchema = z.object({
  status: z.enum([
    'DRAFT',
    'PENDING',
    'IN_PROGRESS',
    'HARD_COPY_REQUIRED',
    'APPROVED',
    'REJECTED',
    'COMPLETED'
  ]).optional(),
  adminNotes: z.string().nullable().optional(),
  sendEmail: z.boolean().optional().default(true),
})

/** GET /api/client/wizard-applications/[id] */
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
    })
    if (!app) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Application not found', 404, {
          requestId,
        })
      )
    }

    const detail = await getWizardApplicationDetail(id)
    return addCorsHeaders(
      createSuccessResponse(
        { application: await mapWizardApplicationDetail(detail!) },
        200,
        { requestId, message: 'Application retrieved' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: `GET /api/client/wizard-applications/${id}`,
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to load application', 500, {
        requestId,
      })
    )
  }
}

/** PATCH /api/client/wizard-applications/[id] — save step answers / progress */
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
        createErrorResponse(
          ErrorCodes.VALIDATION_ERROR,
          'Submitted applications can only be edited by admin',
          400,
          { requestId }
        )
      )
    }

    const body = await request.json()
    const parsed = answersSchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error, requestId)
    }

    const stepValid = await isWizardStepInWizard(
      parsed.data.wizardStepId,
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
      where: { id: parsed.data.wizardStepId },
      select: { approvalRequired: true, adminUseOnly: true },
    })

    const editCheck = await assertClientMayEditStepAnswers({
      applicationId: id,
      wizardStepId: parsed.data.wizardStepId,
      approvalRequired: wizardStep?.approvalRequired ?? false,
      adminUseOnly: wizardStep?.adminUseOnly ?? false,
    })
    if (!editCheck.ok) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.VALIDATION_ERROR, editCheck.message, 400, {
          requestId,
        })
      )
    }

    if (typeof parsed.data.currentStepIndex === 'number') {
      const indexCheck = await assertClientStepIndexAllowed({
        applicationId: id,
        targetStepIndex: parsed.data.currentStepIndex,
      })
      if (!indexCheck.ok) {
        return addCorsHeaders(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, indexCheck.message, 400, {
            requestId,
          })
        )
      }
    }

    await upsertStepAnswers({
      applicationId: id,
      wizardStepId: parsed.data.wizardStepId,
      answers: parsed.data.answers,
      updatedById: authResult.user.userId,
      currentStepIndex: parsed.data.currentStepIndex,
    })

    const savedAnswers = await db.wizardApplicationAnswer.findMany({
      where: { applicationId: id, wizardStepId: parsed.data.wizardStepId },
      select: { value: true, fileUrl: true },
    })

    await syncStepReviewAfterClientSave({
      applicationId: id,
      wizardStepId: parsed.data.wizardStepId,
      approvalRequired: wizardStep?.approvalRequired ?? false,
      answers: savedAnswers.length > 0 ? savedAnswers : parsed.data.answers,
    })

    const detail = await getWizardApplicationDetail(id)
    return addCorsHeaders(
      createSuccessResponse(
        { application: await mapWizardApplicationDetail(detail!) },
        200,
        { requestId, message: 'Progress saved' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: `PATCH /api/client/wizard-applications/${id}`,
      method: 'PATCH',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to save answers', 500, {
        requestId,
      })
    )
  }
}

// ✅ ADMIN PATCH METHOD - Status update with email
/** PATCH /api/admin/wizard-applications/[id] — admin status update with email */
export async function adminPatch(request: NextRequest, context: RouteContext) {
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

    // Check if user is admin
    if (authResult.user.role !== 'ADMIN') {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.AUTHORIZATION_ERROR, 'Admin access required', 403, {
          requestId,
        })
      )
    }

    const body = await request.json()
    const parsed = statusUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error, requestId)
    }

    const { status, adminNotes, sendEmail } = parsed.data

    // Get current application with client info
    const currentApp = await db.wizardApplication.findFirst({
      where: { id, isDeleted: false },
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

    if (!currentApp) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Application not found', 404, {
          requestId,
        })
      )
    }

    const oldStatus = currentApp.status
    const isStatusChanging = status && status !== oldStatus

    // Update application
    const updatedApp = await db.wizardApplication.update({
      where: { id },
      data: {
        ...(status && { status: status as WizardApplicationStatus }),
        ...(adminNotes !== undefined && { adminNotes }),
        updatedAt: new Date(),
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

    // ✅ SEND EMAIL IF STATUS CHANGED
    let emailResult = { success: false, error: 'No email sent' }
    
    if (isStatusChanging && sendEmail !== false && updatedApp.client?.email) {
      try {
        // ✅ FIXED: Use 'as string' to avoid type error
        const emailStatus = status === 'PENDING' ? 'SUBMITTED' : status;
        
        const result = await sendApplicationStatusEmail({
          applicationId: updatedApp.id,
          applicationNumber: updatedApp.applicationNumber,
          status: emailStatus as string, // ✅ Cast to string
          recipientEmail: updatedApp.client.email,
          serviceName: updatedApp.areaOfInterest,
          adminNotes: adminNotes || undefined,
        })
        
        emailResult = {
          success: result.success,
          error: result.error || 'Unknown error',
        }
        
        console.log(`✅ Email sent to client for status: ${status}`)
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError)
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
          emailError: emailResult.error,
        },
        200,
        { 
          requestId, 
          message: `Status updated to ${status}. ${emailResult.success ? 'Email sent to client.' : 'Email failed to send.'}`
        }
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