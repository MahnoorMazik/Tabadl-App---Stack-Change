import { AreaOfInterestKey, AREA_OF_INTEREST_OPTIONS } from '@/components/admin/forms/types'

export { AREA_OF_INTEREST_OPTIONS }
export type { AreaOfInterestKey }

export interface WizardStepDraft {
  id: string
  formTemplateId: string
  paymentRequired: boolean
  approvalRequired: boolean
  source?: 'library' | 'new'
  fieldCount?: number
  formName?: string
}

export interface WizardDraft {
  name: string
  areaOfInterest: AreaOfInterestKey | null
  serviceIds: string[]
  steps: WizardStepDraft[]
}

export interface WizardListItem {
  id: string
  name: string
  areaOfInterest: AreaOfInterestKey
  isActive?: boolean
  serviceIds: string[]
  serviceNames: string[]
  steps: Array<{
    id: string
    formTemplateId: string
    formName: string
    paymentRequired: boolean
    approvalRequired: boolean
  }>
  createdAt: string
}

export function createEmptyWizardDraft(): WizardDraft {
  return {
    name: '',
    areaOfInterest: null,
    serviceIds: [],
    steps: [],
  }
}

export function createEmptyWizardStep(): WizardStepDraft {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    formTemplateId: '',
    paymentRequired: false,
    approvalRequired: false,
  }
}

/** Map API wizard payload into list/edit UI shape */
export function mapApiWizard(wizard: {
  id: string
  name: string
  areaOfInterest: AreaOfInterestKey
  isActive?: boolean
  serviceIds?: string[]
  serviceNames?: string[]
  services?: Array<{ id: string; name: string }>
  steps: Array<{
    id: string
    formTemplateId: string
    formName: string
    paymentRequired: boolean
    approvalRequired: boolean
  }>
  createdAt: string | Date
}): WizardListItem {
  const serviceIds =
    wizard.serviceIds ?? wizard.services?.map((s) => s.id) ?? []
  const serviceNames =
    wizard.serviceNames ?? wizard.services?.map((s) => s.name) ?? []

  return {
    id: wizard.id,
    name: wizard.name,
    areaOfInterest: wizard.areaOfInterest,
    isActive: wizard.isActive ?? true,
    serviceIds,
    serviceNames,
    steps: wizard.steps.map((step) => ({
      id: step.id,
      formTemplateId: step.formTemplateId,
      formName: step.formName,
      paymentRequired: step.paymentRequired,
      approvalRequired: step.approvalRequired,
    })),
    createdAt:
      typeof wizard.createdAt === 'string'
        ? wizard.createdAt
        : wizard.createdAt.toISOString(),
  }
}

