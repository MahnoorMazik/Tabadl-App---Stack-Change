import { db } from '@/lib/db'
import {
  ApplicationWizardStepInput,
  DuplicateWizardFormIdsError,
  normalizeWizardSteps,
} from '@/lib/validations/wizards'
import { assertServicesExist } from '@/lib/forms/template-utils'

export { assertServicesExist }

export function prepareWizardSteps(steps: ApplicationWizardStepInput[]) {
  try {
    return { ok: true as const, steps: normalizeWizardSteps(steps) }
  } catch (error) {
    if (error instanceof DuplicateWizardFormIdsError) {
      return { ok: false as const, duplicateFormTemplateIds: error.formTemplateIds }
    }
    throw error
  }
}

export async function assertFormTemplatesExist(formTemplateIds: string[]) {
  const uniqueIds = [...new Set(formTemplateIds)]
  if (uniqueIds.length === 0) return { ok: true as const }

  const existing = await db.formTemplate.findMany({
    where: { id: { in: uniqueIds }, isDeleted: false, isActive: true },
    select: { id: true },
  })

  if (existing.length !== uniqueIds.length) {
    const found = new Set(existing.map((t) => t.id))
    const missing = uniqueIds.filter((id) => !found.has(id))
    return { ok: false as const, missing }
  }

  return { ok: true as const }
}

const wizardDetailInclude = {
  services: {
    include: {
      service: {
        select: { id: true, name: true, slug: true, isActive: true },
      },
    },
  },
  steps: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      formTemplate: {
        select: {
          id: true,
          name: true,
          areaOfInterest: true,
          isActive: true,
          isDeleted: true,
        },
      },
    },
  },
}

export async function getWizardDetail(id: string) {
  return db.applicationWizard.findFirst({
    where: { id, isDeleted: false },
    include: wizardDetailInclude,
  })
}

export function mapWizardDetail(
  wizard: NonNullable<Awaited<ReturnType<typeof getWizardDetail>>>
) {
  return {
    id: wizard.id,
    name: wizard.name,
    areaOfInterest: wizard.areaOfInterest,
    isActive: wizard.isActive,
    createdAt: wizard.createdAt,
    updatedAt: wizard.updatedAt,
    serviceIds: wizard.services.map((s) => s.service.id),
    serviceNames: wizard.services.map((s) => s.service.name),
    services: wizard.services.map((s) => ({
      id: s.service.id,
      name: s.service.name,
      slug: s.service.slug,
      isActive: s.service.isActive,
    })),
    steps: wizard.steps.map((step) => ({
      id: step.id,
      formTemplateId: step.formTemplateId,
      formName: step.formTemplate.name,
      paymentRequired: step.paymentRequired,
      approvalRequired: step.approvalRequired,
      sortOrder: step.sortOrder,
    })),
  }
}

export async function replaceWizardRelations(
  wizardId: string,
  data: {
    name?: string
    areaOfInterest?: 'CR' | 'PR'
    isActive?: boolean
    serviceIds?: string[]
    steps?: Array<{
      formTemplateId: string
      sortOrder: number
      paymentRequired: boolean
      approvalRequired: boolean
    }>
  }
) {
  await db.$transaction(async (tx) => {
    const existing = await tx.applicationWizard.findUnique({
      where: { id: wizardId },
      select: { areaOfInterest: true },
    })

    const updateData: {
      name?: string
      areaOfInterest?: 'CR' | 'PR'
      isActive?: boolean
    } = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.areaOfInterest !== undefined) {
      updateData.areaOfInterest = data.areaOfInterest
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    if (Object.keys(updateData).length > 0) {
      await tx.applicationWizard.update({
        where: { id: wizardId },
        data: updateData,
      })
    }

    if (data.isActive === true && existing) {
      await tx.applicationWizard.updateMany({
        where: {
          areaOfInterest: data.areaOfInterest ?? existing.areaOfInterest,
          isDeleted: false,
          id: { not: wizardId },
        },
        data: { isActive: false },
      })
    }

    if (data.steps) {
      await tx.applicationWizardStep.deleteMany({ where: { wizardId } })
      await tx.applicationWizardStep.createMany({
        data: data.steps.map((step) => ({
          wizardId,
          formTemplateId: step.formTemplateId,
          sortOrder: step.sortOrder,
          paymentRequired: step.paymentRequired,
          approvalRequired: step.approvalRequired,
        })),
      })
    }

    if (data.serviceIds) {
      await tx.applicationWizardService.deleteMany({ where: { wizardId } })
      if (data.serviceIds.length > 0) {
        await tx.applicationWizardService.createMany({
          data: data.serviceIds.map((serviceId) => ({
            wizardId,
            serviceId,
          })),
        })
      }
    }
  })
}
