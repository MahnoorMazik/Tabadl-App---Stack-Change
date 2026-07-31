import { WizardStepApprovalStatus } from '@prisma/client'
import { db } from '@/lib/db'
import {
  canClientAccessStepIndex,
  findUnapprovedRequiredStepIndex,
} from '@/lib/wizards/wizard-step-approval-rules'

async function getApprovalGatesForApplication(applicationId: string) {
  const app = await db.wizardApplication.findFirst({
    where: { id: applicationId, isDeleted: false },
    select: {
      wizard: {
        select: {
          steps: {
            orderBy: { sortOrder: 'asc' as const },
            select: { id: true, approvalRequired: true },
          },
        },
      },
      stepReviews: { select: { wizardStepId: true, status: true } },
    },
  })
  if (!app) return []

  const statusByStepId = new Map(
    app.stepReviews.map((r) => [r.wizardStepId, r.status])
  )

  return app.wizard.steps.map((s) => ({
    id: s.id,
    approvalRequired: s.approvalRequired,
    approvalStatus: (statusByStepId.get(s.id) as StepApprovalStatus) ?? null,
  }))
}

export {
  canClientAccessStepIndex,
  firstBlockingApprovalStepBefore,
  approvalAdvanceBlockedReason,
  findUnapprovedRequiredStepIndex,
  maxAccessibleStepIndex,
  hasPendingStepApproval,
  resolveClientStepIndexAfterUpdate,
} from '@/lib/wizards/wizard-step-approval-rules'
export type { StepApprovalGate } from '@/lib/wizards/wizard-step-approval-rules'

export type StepApprovalStatus = WizardStepApprovalStatus | null

export function stepHasSavedAnswers(
  answers: Array<{ value: string | null; fileUrl: string | null }>
) {
  return answers.some((a) => Boolean(a.value?.trim()) || Boolean(a.fileUrl?.trim()))
}

export async function getStepReview(applicationId: string, wizardStepId: string) {
  return db.wizardApplicationStepReview.findUnique({
    where: {
      applicationId_wizardStepId: { applicationId, wizardStepId },
    },
  })
}

/**
 * If an approval-required step has answers but no review row yet,
 * create a PENDING review so admin list/detail can show & approve it.
 */
export async function ensurePendingStepReviewsForApplications(
  applicationIds: string[]
) {
  const uniqueIds = [...new Set(applicationIds.filter(Boolean))]
  if (uniqueIds.length === 0) return 0

  const apps = await db.wizardApplication.findMany({
    where: { id: { in: uniqueIds }, isDeleted: false },
    select: {
      id: true,
      wizard: {
        select: {
          steps: {
            where: { approvalRequired: true },
            select: { id: true },
          },
        },
      },
      answers: { select: { wizardStepId: true, value: true, fileUrl: true } },
      stepReviews: { select: { wizardStepId: true } },
    },
  })

  let created = 0
  for (const app of apps) {
    const answered = new Set(
      app.answers
        .filter((a) => Boolean(a.value?.trim()) || Boolean(a.fileUrl?.trim()))
        .map((a) => a.wizardStepId)
    )
    const reviewed = new Set(app.stepReviews.map((r) => r.wizardStepId))

    for (const step of app.wizard.steps) {
      if (!answered.has(step.id) || reviewed.has(step.id)) continue
      await db.wizardApplicationStepReview.upsert({
        where: {
          applicationId_wizardStepId: {
            applicationId: app.id,
            wizardStepId: step.id,
          },
        },
        create: {
          applicationId: app.id,
          wizardStepId: step.id,
          status: WizardStepApprovalStatus.PENDING,
        },
        update: {},
      })
      created += 1
    }
  }

  return created
}

export async function assertClientMayEditStepAnswers(params: {
  applicationId: string
  wizardStepId: string
  approvalRequired: boolean
  adminUseOnly?: boolean
}) {
  if (params.adminUseOnly) {
    return {
      ok: false as const,
      message: 'This step can only be completed by an administrator.',
    }
  }

  if (!params.approvalRequired) return { ok: true as const }

  const review = await getStepReview(params.applicationId, params.wizardStepId)
  if (!review) return { ok: true as const }

  if (review.status === WizardStepApprovalStatus.APPROVED) {
    return {
      ok: false as const,
      message: 'This step was approved and can no longer be edited.',
    }
  }

  return { ok: true as const }
}

export async function syncStepReviewAfterClientSave(params: {
  applicationId: string
  wizardStepId: string
  approvalRequired: boolean
  answers: Array<{ value?: string | null; fileUrl?: string | null }>
}) {
  if (!params.approvalRequired) return

  const hasData = stepHasSavedAnswers(
    params.answers.map((a) => ({
      value: a.value ?? null,
      fileUrl: a.fileUrl ?? null,
    }))
  )
  if (!hasData) return

  const existing = await getStepReview(params.applicationId, params.wizardStepId)
  if (existing?.status === WizardStepApprovalStatus.APPROVED) return

  await db.wizardApplicationStepReview.upsert({
    where: {
      applicationId_wizardStepId: {
        applicationId: params.applicationId,
        wizardStepId: params.wizardStepId,
      },
    },
    create: {
      applicationId: params.applicationId,
      wizardStepId: params.wizardStepId,
      status: WizardStepApprovalStatus.PENDING,
    },
    update: {
      status: WizardStepApprovalStatus.PENDING,
      rejectionNote: null,
      reviewedById: null,
      reviewedAt: null,
    },
  })
}

export async function setStepApproval(params: {
  applicationId: string
  wizardStepId: string
  status: 'APPROVED' | 'REJECTED'
  reviewedById: string
  rejectionNote?: string | null
}) {
  return db.wizardApplicationStepReview.upsert({
    where: {
      applicationId_wizardStepId: {
        applicationId: params.applicationId,
        wizardStepId: params.wizardStepId,
      },
    },
    create: {
      applicationId: params.applicationId,
      wizardStepId: params.wizardStepId,
      status: params.status,
      reviewedById: params.reviewedById,
      reviewedAt: new Date(),
      rejectionNote: params.rejectionNote ?? null,
    },
    update: {
      status: params.status,
      reviewedById: params.reviewedById,
      reviewedAt: new Date(),
      rejectionNote: params.rejectionNote ?? null,
    },
  })
}

export async function assertClientStepIndexAllowed(params: {
  applicationId: string
  targetStepIndex: number
}) {
  const gates = await getApprovalGatesForApplication(params.applicationId)
  if (params.targetStepIndex <= 0 || gates.length === 0) return { ok: true as const }

  if (canClientAccessStepIndex(gates, params.targetStepIndex)) {
    return { ok: true as const }
  }

  return {
    ok: false as const,
    message:
      'Complete and get admin approval on earlier steps before opening this step.',
  }
}

export async function assertAllRequiredApprovalsForSubmit(params: {
  applicationId: string
}) {
  const gates = await getApprovalGatesForApplication(params.applicationId)
  const idx = findUnapprovedRequiredStepIndex(gates)
  if (idx === null) return { ok: true as const }

  return {
    ok: false as const,
    message: `Step ${idx + 1} requires admin approval before you can submit the application.`,
  }
}
