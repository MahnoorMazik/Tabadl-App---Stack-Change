import { NextRequest } from 'next/server'
import { UserRole, WizardStepApprovalStatus } from '@prisma/client'
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

export const OPTIONS = () => handleCorsPreflight()

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
              select: { id: true },
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
          where: { status: WizardStepApprovalStatus.PENDING },
          select: {
            wizardStepId: true,
            wizardStep: {
              select: {
                formTemplate: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    const mapped = applications.map((app) => {
      const answeredSteps = new Set(
        app.answers.filter((a) => a.value || a.fileUrl).map((a) => a.wizardStepId)
      )
      const totalSteps = app.wizard.steps.length
      const stepIndexById = new Map(
        app.wizard.steps.map((step, index) => [step.id, index])
      )
      const pendingApprovals = app.stepReviews.map((review) => {
        const stepIndex = stepIndexById.get(review.wizardStepId) ?? 0
        return {
          wizardStepId: review.wizardStepId,
          stepIndex,
          stepNumber: stepIndex + 1,
          formName: review.wizardStep.formTemplate.name,
        }
      })
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
