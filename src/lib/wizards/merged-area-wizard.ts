import { AreaOfInterest } from '@prisma/client'
import { db } from '@/lib/db'

const stepFormInclude = {
  formTemplate: {
    select: {
      id: true,
      name: true,
      description: true,
      fields: {
        orderBy: { sortOrder: 'asc' as const },
        include: { field: true },
      },
    },
  },
} as const

export type MergedWizardStep = Awaited<
  ReturnType<typeof fetchMergedStepsForArea>
>[number]

/** The single client-facing active wizard for an area (most recently updated if multiple). */
export async function fetchActiveWizardForArea(areaOfInterest: AreaOfInterest) {
  return db.applicationWizard.findFirst({
    where: {
      areaOfInterest,
      isDeleted: false,
      isActive: true,
      steps: { some: {} },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      steps: {
        orderBy: { sortOrder: 'asc' },
        include: stepFormInclude,
      },
    },
  })
}

/** Steps for the active wizard only (not merged across wizards). */
export async function fetchMergedStepsForArea(areaOfInterest: AreaOfInterest) {
  const wizard = await fetchActiveWizardForArea(areaOfInterest)
  if (!wizard) return []

  return wizard.steps.map((step) => ({
    ...step,
    sourceWizardId: wizard.id,
    sourceWizardName: wizard.name,
  }))
}

export async function countMergedStepsForArea(areaOfInterest: AreaOfInterest) {
  const wizard = await fetchActiveWizardForArea(areaOfInterest)
  return wizard?.steps.length ?? 0
}

/** Active wizard step counts per area (for availability checks). */
export async function countMergedStepsByAreas(areas: AreaOfInterest[]) {
  const unique = [...new Set(areas)]
  const counts = {} as Record<string, number>
  for (const area of unique) {
    counts[area] = await countMergedStepsForArea(area)
  }
  return counts as Record<AreaOfInterest, number>
}

export async function getAnchorWizardForArea(areaOfInterest: AreaOfInterest) {
  const wizard = await fetchActiveWizardForArea(areaOfInterest)
  if (!wizard) return null
  return {
    id: wizard.id,
    name: wizard.name,
    areaOfInterest: wizard.areaOfInterest,
  }
}

export async function isWizardStepInArea(
  wizardStepId: string,
  areaOfInterest: AreaOfInterest
) {
  const wizard = await fetchActiveWizardForArea(areaOfInterest)
  if (!wizard) return false
  return wizard.steps.some((s) => s.id === wizardStepId)
}

export async function isWizardStepInWizard(wizardStepId: string, wizardId: string) {
  const step = await db.applicationWizardStep.findFirst({
    where: { id: wizardStepId, wizardId },
    select: { id: true },
  })
  return Boolean(step)
}

export function mergedApplicationDisplayName(areaOfInterest: string) {
  const labels: Record<string, string> = {
    CR: 'Company Registration (CR)',
    PR: 'Private Registration (PR)',
  }
  const label = labels[areaOfInterest] ?? areaOfInterest
  return `${label} — application`
}

/** When a wizard is activated, deactivate other wizards in the same service (CR or PR). */
export async function deactivateOtherWizardsInArea(
  wizardId: string,
  areaOfInterest: AreaOfInterest
) {
  await db.applicationWizard.updateMany({
    where: {
      areaOfInterest,
      isDeleted: false,
      id: { not: wizardId },
    },
    data: { isActive: false },
  })
}
