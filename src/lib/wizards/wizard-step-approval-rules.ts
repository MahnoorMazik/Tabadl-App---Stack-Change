export type StepApprovalGate = {
  approvalRequired?: boolean
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
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
    return 'This step is waiting for admin approval before you can continue.'
  }
  if (step.approvalStatus === 'REJECTED') {
    return 'Update this step and save again. Admin must approve it before the next step opens.'
  }
  return 'Save this step first. Admin must approve it before you can open the next step.'
}

/** Any approval-required step not yet approved (for submit). */
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
