import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldLockClientStepByApproval } from './wizard-step-approval-rules'

test('locks the current step once it is sent for admin approval', () => {
  const steps = [
    {
      approvalRequired: false,
      approvalStatus: null,
      fields: [],
    },
    {
      approvalRequired: true,
      approvalStatus: 'PENDING',
      fields: [],
    },
  ]

  assert.equal(shouldLockClientStepByApproval(steps, 1), true)
})

test('locks earlier steps when a later approval-required step is pending approval', () => {
  const steps = [
    {
      approvalRequired: false,
      approvalStatus: null,
      fields: [],
    },
    {
      approvalRequired: true,
      approvalStatus: 'PENDING',
      fields: [],
    },
  ]

  assert.equal(shouldLockClientStepByApproval(steps, 0), true)
})

test('locks the current and earlier steps when a later approval-required step is approved', () => {
  const steps = [
    {
      approvalRequired: false,
      approvalStatus: null,
      fields: [],
    },
    {
      approvalRequired: true,
      approvalStatus: 'APPROVED',
      fields: [],
    },
  ]

  assert.equal(shouldLockClientStepByApproval(steps, 0), true)
  assert.equal(shouldLockClientStepByApproval(steps, 1), true)
})

test('keeps rejected steps editable', () => {
  const steps = [
    {
      approvalRequired: true,
      approvalStatus: 'REJECTED',
      fields: [],
    },
    {
      approvalRequired: true,
      approvalStatus: 'PENDING',
      fields: [],
    },
  ]

  assert.equal(shouldLockClientStepByApproval(steps, 0), false)
  assert.equal(shouldLockClientStepByApproval(steps, 1), true)
})
