import { z } from 'zod'
import { AREA_OF_INTEREST_KEYS } from '@/lib/validations/forms'

const wizardStepSchema = z.object({
  formTemplateId: z.string().min(1, 'Form template is required'),
  paymentRequired: z.boolean().optional().default(false),
  sortOrder: z.number().int().min(0).optional(),
})

export const applicationWizardSchema = z.object({
  name: z.string().trim().min(1, 'Wizard name is required').max(200),
  areaOfInterest: z.enum(AREA_OF_INTEREST_KEYS, {
    message: 'Area of interest is required',
  }),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string().min(1)).default([]),
  steps: z
    .array(wizardStepSchema)
    .min(1, 'Wizard must contain at least one step'),
})

export const applicationWizardUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Wizard name is required').max(200).optional(),
  areaOfInterest: z.enum(AREA_OF_INTEREST_KEYS).optional(),
  isActive: z.boolean().optional(),
  serviceIds: z.array(z.string().min(1)).optional(),
  steps: z
    .array(wizardStepSchema)
    .min(1, 'Wizard must contain at least one step')
    .optional(),
})

export type ApplicationWizardInput = z.infer<typeof applicationWizardSchema>
export type ApplicationWizardStepInput = z.infer<typeof wizardStepSchema>

export class DuplicateWizardFormIdsError extends Error {
  formTemplateIds: string[]

  constructor(formTemplateIds: string[]) {
    super('Duplicate form templates are not allowed in a wizard')
    this.name = 'DuplicateWizardFormIdsError'
    this.formTemplateIds = [...new Set(formTemplateIds)]
  }
}

/** Normalize sortOrder to contiguous 0..n-1 based on provided order */
export function normalizeWizardSteps(steps: ApplicationWizardStepInput[]) {
  const seen = new Set<string>()
  const duplicates: string[] = []

  for (const step of steps) {
    if (seen.has(step.formTemplateId)) {
      duplicates.push(step.formTemplateId)
    }
    seen.add(step.formTemplateId)
  }

  if (duplicates.length > 0) {
    throw new DuplicateWizardFormIdsError(duplicates)
  }

  return [...steps]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((step, index) => ({
      formTemplateId: step.formTemplateId,
      sortOrder: index,
      paymentRequired: step.paymentRequired ?? false,
    }))
}
