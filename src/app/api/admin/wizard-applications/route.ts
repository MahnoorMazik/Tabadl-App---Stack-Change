import { NextRequest } from 'next/server'
import { AreaOfInterest, UserRole, WizardApplicationStatus, WizardStepApprovalStatus } from '@prisma/client'
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
import { ensurePendingStepReviewsForApplications } from '@/lib/wizards/wizard-step-approval'
import { getAnchorWizardForArea } from '@/lib/wizards/merged-area-wizard'
import {
  generateWizardApplicationNumber,
  getWizardApplicationDetail,
  mapWizardApplicationDetail,
} from '@/lib/wizards/wizard-application-utils'

export const OPTIONS = () => handleCorsPreflight()

const startForClientSchema = z.object({
  clientId: z.string().min(1),
  areaOfInterest: z.enum(['CR', 'PR']),
})

/** GET /api/admin/wizard-applications — all client wizard applications */
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

    if (authResult.user.role !== UserRole.STAFF && authResult.user.role !== UserRole.ADMIN) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.AUTHORIZATION_ERROR, 'Staff access required', 403, {
          requestId,
        })
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limitParam = searchParams.get('limit')
    const limit = limitParam === 'all' ? undefined : parseInt(limitParam || '25', 10)

    const where: Record<string, unknown> = { isDeleted: false }

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      const sanitized = search.replace(/['"\\]/g, '')
      where.OR = [
        { applicationNumber: { contains: sanitized } },
        { client: { name: { contains: sanitized } } },
        { client: { email: { contains: sanitized } } },
        { wizard: { name: { contains: sanitized } } },
      ]
    }

    const total = await db.wizardApplication.count({ where })
    const totalPages = limit ? Math.ceil(total / limit) : 1

    const applications = await db.wizardApplication.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: limit ? (page - 1) * limit : undefined,
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        wizard: {
          select: {
            id: true,
            name: true,
            areaOfInterest: true,
            steps: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                approvalRequired: true,
                formTemplate: { select: { name: true } },
              },
            },
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        answers: {
          select: { wizardStepId: true, value: true, fileUrl: true },
        },
        stepReviews: {
          select: {
            wizardStepId: true,
            status: true,
          },
        },
      },
    })

    // Backfill missing PENDING reviews for answered approval steps
    const created = await ensurePendingStepReviewsForApplications(
      applications.map((a) => a.id)
    )
    if (created > 0) {
      const freshReviews = await db.wizardApplicationStepReview.findMany({
        where: { applicationId: { in: applications.map((a) => a.id) } },
        select: { applicationId: true, wizardStepId: true, status: true },
      })
      type StepReviewLite = {
        wizardStepId: string
        status: (typeof freshReviews)[number]['status']
      }
      const byApp = new Map<string, StepReviewLite[]>()
      for (const review of freshReviews) {
        const list = byApp.get(review.applicationId) ?? []
        list.push({ wizardStepId: review.wizardStepId, status: review.status })
        byApp.set(review.applicationId, list)
      }
      for (const app of applications) {
        ;(app as { stepReviews: StepReviewLite[] }).stepReviews =
          byApp.get(app.id) ?? app.stepReviews
      }
    }

    const mapped = applications.map((app) => {
      const answeredSteps = new Set(
        app.answers.filter((a) => a.value || a.fileUrl).map((a) => a.wizardStepId)
      )
      const totalSteps = app.wizard.steps.length
      const reviewByStepId = new Map(
        app.stepReviews.map((r) => [r.wizardStepId, r.status])
      )

      const pendingApprovals = app.wizard.steps
        .map((step, stepIndex) => {
          if (!step.approvalRequired) return null
          if (!answeredSteps.has(step.id)) return null

          const status = reviewByStepId.get(step.id) ?? null
          if (status === WizardStepApprovalStatus.APPROVED) return null
          if (status === WizardStepApprovalStatus.REJECTED) return null

          return {
            wizardStepId: step.id,
            stepIndex,
            stepNumber: stepIndex + 1,
            formName: step.formTemplate.name,
            status: 'PENDING' as const,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      pendingApprovals.sort((a, b) => a.stepIndex - b.stepIndex)

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
        client: app.client,
        assignedTo: app.assignedTo,
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
        pendingApprovals,
        hasPendingApproval: pendingApprovals.length > 0,
        pendingApprovalCount: pendingApprovals.length,
      }
    })

    return addCorsHeaders(
      createSuccessResponse(
        {
          applications: mapped,
          pagination: {
            page,
            limit: limit ?? total,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
        200,
        { requestId, message: 'Wizard applications retrieved' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: 'GET /api/admin/wizard-applications',
      method: 'GET',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to load applications', 500, {
        requestId,
      })
    )
  }
}

/** POST /api/admin/wizard-applications — start CR/PR application for a client */
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

    if (authResult.user.role !== UserRole.STAFF && authResult.user.role !== UserRole.ADMIN) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.AUTHORIZATION_ERROR, 'Staff access required', 403, {
          requestId,
        })
      )
    }

    const body = await request.json()
    const parsed = startForClientSchema.safeParse(body)
    if (!parsed.success) {
      return zodErrorResponse(parsed.error, requestId)
    }

    const client = await db.client.findFirst({
      where: { id: parsed.data.clientId, isDeleted: false },
      select: { id: true, name: true, email: true },
    })
    if (!client) {
      return addCorsHeaders(
        createErrorResponse(ErrorCodes.NOT_FOUND_ERROR, 'Client not found', 404, {
          requestId,
        })
      )
    }

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

    const existingDraft = await db.wizardApplication.findFirst({
      where: {
        clientId: client.id,
        areaOfInterest: area,
        isDeleted: false,
        status: WizardApplicationStatus.DRAFT,
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (existingDraft) {
      const detail = await getWizardApplicationDetail(existingDraft.id)
      return addCorsHeaders(
        createSuccessResponse(
          {
            application: await mapWizardApplicationDetail(detail!),
            resumed: true,
          },
          200,
          { requestId, message: 'Existing draft application resumed' }
        )
      )
    }

    const created = await db.wizardApplication.create({
      data: {
        applicationNumber: generateWizardApplicationNumber(),
        clientId: client.id,
        wizardId: anchor.id,
        areaOfInterest: area,
        status: WizardApplicationStatus.DRAFT,
        currentStepIndex: 0,
      },
    })

    const detail = await getWizardApplicationDetail(created.id)
    return addCorsHeaders(
      createSuccessResponse(
        {
          application: await mapWizardApplicationDetail(detail!),
          resumed: false,
        },
        201,
        { requestId, message: 'Application started for client' }
      )
    )
  } catch (error: unknown) {
    logError(error instanceof Error ? error : new Error(String(error)), {
      code: ErrorCodes.INTERNAL_ERROR,
      requestId,
      endpoint: 'POST /api/admin/wizard-applications',
      method: 'POST',
    })
    return addCorsHeaders(
      createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to start application', 500, {
        requestId,
      })
    )
  }
}
