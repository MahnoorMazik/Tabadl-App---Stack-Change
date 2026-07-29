import { WizardStepApprovalStatus, AreaOfInterest } from '@prisma/client'
import { db } from '@/lib/db'
import { fetchMergedStepsForArea } from '@/lib/wizards/merged-area-wizard'
import {
  canClientAccessStepIndex,
  findUnapprovedRequiredStepIndex,
} from '@/lib/wizards/wizard-step-approval-rules'

export {
  canClientAccessStepIndex,
  firstBlockingApprovalStepBefore,
  approvalAdvanceBlockedReason,
  findUnapprovedRequiredStepIndex,
  maxAccessibleStepIndex,
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

export async function assertClientMayEditStepAnswers(params: {
  applicationId: string
  wizardStepId: string
  approvalRequired: boolean
}) {
  if (!params.approvalRequired) return { ok: true as const }

  const review = await getStepReview(params.applicationId, params.wizardStepId)
  if (!review) return { ok: true as const }

  if (
    review.status === WizardStepApprovalStatus.PENDING ||
    review.status === WizardStepApprovalStatus.APPROVED
  ) {
    return {
      ok: false as const,
      message:
        review.status === WizardStepApprovalStatus.APPROVED
          ? 'This step was approved and can no longer be edited.'
          : 'This step is pending admin approval and cannot be edited.',
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
  areaOfInterest: AreaOfInterest
  targetStepIndex: number
}) {
  const mergedSteps = await fetchMergedStepsForArea(params.areaOfInterest)
  if (params.targetStepIndex <= 0) return { ok: true as const }

  const reviews = await db.wizardApplicationStepReview.findMany({
    where: { applicationId: params.applicationId },
    select: { wizardStepId: true, status: true },
  })
  const statusByStepId = new Map(reviews.map((r) => [r.wizardStepId, r.status]))

  const gates = mergedSteps.map((s) => ({
    approvalRequired: s.approvalRequired,
    approvalStatus: (statusByStepId.get(s.id) as StepApprovalStatus) ?? null,
  }))

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
  areaOfInterest: AreaOfInterest
}) {
  const mergedSteps = await fetchMergedStepsForArea(params.areaOfInterest)
  const reviews = await db.wizardApplicationStepReview.findMany({
    where: { applicationId: params.applicationId },
    select: { wizardStepId: true, status: true },
  })
  const statusByStepId = new Map(reviews.map((r) => [r.wizardStepId, r.status]))

  const gates = mergedSteps.map((s) => ({
    approvalRequired: s.approvalRequired,
    approvalStatus: (statusByStepId.get(s.id) as StepApprovalStatus) ?? null,
  }))

  const idx = findUnapprovedRequiredStepIndex(gates)
  if (idx === null) return { ok: true as const }

  return {
    ok: false as const,
    message: `Step ${idx + 1} requires admin approval before you can submit the application.`,
  }
}
