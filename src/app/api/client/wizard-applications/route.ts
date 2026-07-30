import { NextRequest } from 'next/server'
import { AreaOfInterest, WizardApplicationStatus } from '@prisma/client'
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
  generateWizardApplicationNumber,
  getWizardApplicationDetail,
  mapWizardApplicationDetail,
} from '@/lib/wizards/wizard-application-utils'
import {
  getAnchorWizardForArea,
} from '@/lib/wizards/merged-area-wizard'

export const OPTIONS = () => handleCorsPreflight()

const startSchema = z
  .object({
    wizardId: z.string().min(1).optional(),
    areaOfInterest: z.enum(['CR', 'PR']).optional(),
  })
  .refine((data) => data.wizardId || data.areaOfInterest, {
    message: 'Provide areaOfInterest or wizardId',
  })

/** GET /api/client/wizard-applications — all my started + submitted applications */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)

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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      clientId: access.client.id,
      isDeleted: false,
    }
    if (status && status !== 'all') {
      where.status = status
    }

    const applications = await db.wizardApplication.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        wizard: {
          select: {
            id: true,
            name: true,
            areaOfInterest: true,
            steps: { select: { id: true } },
          },
        },
        answers: { select: { wizardStepId: true, value: true, fileUrl: true } },
      },
    })

    const mapped = applications.map((app) => {
      const answeredSteps = new Set(
        app.answers.filter((a) => a.value || a.fileUrl).map((a) => a.wizardStepId)
      )
      const totalSteps = app.wizard.steps.length
      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        status: app.status,
        areaOfInterest: app.areaOfInterest,
        currentStepIndex: app.currentStepIndex,
        submittedAt: app.submittedAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        adminNotes: app.adminNotes,
        wizard: {
          id: app.wizard.id,
          name: app.wizard.name,
          areaOfInterest: app.wizard.areaOfInterest,
        },
        progress: {
          totalSteps,
          completedSteps: answeredSteps.size,
          currentStepIndex: app.currentStepIndex,
        },
      }
    })

    return addCorsHeaders(
      createSuccessResponse(
        { applications: mapped },
        200,
        { requestId, message: 'Applications retrieved successfully' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: 'GET /api/client/wizard-applications',
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to load applications', 500, {
        requestId,
      })
    )
  }
}

/** POST /api/client/wizard-applications — start a wizard application */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

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

    const body = await request.json()
    const parsed = startSchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error, requestId)
    }

    let wizard: { id: string; areaOfInterest: AreaOfInterest } | null = null

    if (parsed.data.areaOfInterest) {
      const area = parsed.data.areaOfInterest as AreaOfInterest
      const anchor = await getAnchorWizardForArea(area)
      if (!anchor) {
        return addCorsHeaders(
          createErrorResponse(
            ErrorCodes.NOT_FOUND_ERROR,
            'No forms available for this service yet',
            404,
            { requestId }
          )
        )
      }
      wizard = { id: anchor.id, areaOfInterest: anchor.areaOfInterest }
    } else {
      const found = await db.applicationWizard.findFirst({
        where: {
          id: parsed.data.wizardId!,
          isDeleted: false,
          isActive: true,
        },
        include: {
          steps: { orderBy: { sortOrder: 'asc' }, select: { id: true } },
        },
      })
      if (!found) {
        return addCorsHeaders(
          createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Wizard not found or inactive', 404, {
            requestId,
          })
        )
      }
      if (found.steps.length === 0) {
        return addCorsHeaders(
          createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Wizard has no steps', 400, {
            requestId,
          })
        )
      }
      wizard = { id: found.id, areaOfInterest: found.areaOfInterest as AreaOfInterest }
    }

    const existingDraft = await db.wizardApplication.findFirst({
      where: {
        clientId: access.client.id,
        areaOfInterest: wizard.areaOfInterest,
        isDeleted: false,
        status: WizardApplicationStatus.DRAFT,
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (existingDraft) {
      const detail = await getWizardApplicationDetail(existingDraft.id)
      return addCorsHeaders(
        createSuccessResponse(
          { application: await mapWizardApplicationDetail(detail!) },
          200,
          { requestId, message: 'Existing application resumed' }
        )
      )
    }

    const created = await db.wizardApplication.create({
      data: {
        applicationNumber: generateWizardApplicationNumber(),
        clientId: access.client.id,
        wizardId: wizard.id,
        areaOfInterest: wizard.areaOfInterest,
        status: WizardApplicationStatus.DRAFT,
        currentStepIndex: 0,
      },
    })

    const detail = await getWizardApplicationDetail(created.id)

    return addCorsHeaders(
      createSuccessResponse(
        { application: await mapWizardApplicationDetail(detail!) },
        201,
        { requestId, message: 'Application started' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: 'POST /api/client/wizard-applications',
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to start application', 500, {
        requestId,
      })
    )
  }
}
