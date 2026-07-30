export type StepApprovalGate = {
  approvalRequired?: boolean
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
}

export function shouldLockClientStepByApproval(
  steps: StepApprovalGate[],
  index: number
): boolean {
  const step = steps[index]
  if (!step) return false

  if (step.approvalStatus === 'REJECTED') return false

  return steps.some((candidate, candidateIndex) => {
    if (candidateIndex < index) return false
    if (!candidate.approvalRequired) return false
    return candidate.approvalStatus === 'PENDING' || candidate.approvalStatus === 'APPROVED'
  })
}

/** First step index (0-based) before `targetIndex` that blocks access, or null. */
export function firstBlockingApprovalStepBefore(
  steps: StepApprovalGate[],
  targetIndex: number
): number | null {
  for (let j = 0; j < targetIndex; j++) {
    const step = steps[j]
    if (step.approvalRequired && step.approvalStatus !== 'APPROVED') {
      return j
    }
  }
  return null
}

export function canClientAccessStepIndex(
  steps: StepApprovalGate[],
  targetIndex: number
): boolean {
  if (targetIndex < 0 || targetIndex >= steps.length) return false
  return firstBlockingApprovalStepBefore(steps, targetIndex) === null
}

export function approvalAdvanceBlockedReason(step: StepApprovalGate): string {
  if (!step.approvalRequired) {
    return 'Complete the previous step before continuing.'
  }
  if (step.approvalStatus === 'PENDING') {
    return 'This step is waiting for admin approval. The next step will open once admin approves.'
  }
  if (step.approvalStatus === 'REJECTED') {
    return 'Update this step and save again for admin review before continuing.'
  }
  return 'Save this step and send it for admin approval before opening the next step.'
}

export function hasPendingStepApproval(steps: StepApprovalGate[]): boolean {
  return steps.some(
    (s) => s.approvalRequired && s.approvalStatus === 'PENDING'
  )
}

/** After admin approves a step, move client to the next accessible step if needed. */
export function resolveClientStepIndexAfterUpdate(
  steps: StepApprovalGate[],
  previousIndex: number
): number {
  const allowedMax = maxAccessibleStepIndex(steps)
  const prevStep = steps[previousIndex]

  if (
    prevStep?.approvalRequired &&
    prevStep.approvalStatus === 'APPROVED' &&
    previousIndex < allowedMax
  ) {
    return previousIndex + 1
  }

  return Math.min(Math.max(0, previousIndex), allowedMax)
}

/** Any approval-required step not yet approved (for full application submit). */
export function findUnapprovedRequiredStepIndex(steps: StepApprovalGate[]): number | null {
  for (let j = 0; j < steps.length; j++) {
    if (steps[j].approvalRequired && steps[j].approvalStatus !== 'APPROVED') {
      return j
    }
  }
  return null
}

/** Highest step index the client may open in the sidebar / navigator. */
export function maxAccessibleStepIndex(steps: StepApprovalGate[]): number {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (canClientAccessStepIndex(steps, i)) return i
  }
  return 0
}
