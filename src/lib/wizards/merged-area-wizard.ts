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

/** All active wizard steps for an area, in admin creation order then step sort order. */
export async function fetchMergedStepsForArea(areaOfInterest: AreaOfInterest) {
  const wizards = await db.applicationWizard.findMany({
    where: {
      areaOfInterest,
      isDeleted: false,
      isActive: true,
    },
    orderBy: { createdAt: 'asc' },
    include: {
      steps: {
        orderBy: { sortOrder: 'asc' },
        include: stepFormInclude,
      },
    },
  })

  return wizards.flatMap((wizard) =>
    wizard.steps.map((step) => ({
      ...step,
      sourceWizardId: wizard.id,
      sourceWizardName: wizard.name,
    }))
  )
}

export async function countMergedStepsForArea(areaOfInterest: AreaOfInterest) {
  return db.applicationWizardStep.count({
    where: {
      wizard: {
        areaOfInterest,
        isDeleted: false,
        isActive: true,
      },
    },
  })
}

/** Count merged steps per area in one query (for list views). */
export async function countMergedStepsByAreas(areas: AreaOfInterest[]) {
  const unique = [...new Set(areas)]
  if (unique.length === 0) return {} as Record<AreaOfInterest, number>

  const rows = await db.applicationWizardStep.findMany({
    where: {
      wizard: {
        areaOfInterest: { in: unique },
        isDeleted: false,
        isActive: true,
      },
    },
    select: {
      id: true,
      wizard: { select: { areaOfInterest: true } },
    },
  })

  const counts = {} as Record<string, number>
  for (const area of unique) counts[area] = 0
  for (const row of rows) {
    counts[row.wizard.areaOfInterest] = (counts[row.wizard.areaOfInterest] ?? 0) + 1
  }
  return counts as Record<AreaOfInterest, number>
}

export async function getAnchorWizardForArea(areaOfInterest: AreaOfInterest) {
  return db.applicationWizard.findFirst({
    where: {
      areaOfInterest,
      isDeleted: false,
      isActive: true,
      steps: { some: {} },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, areaOfInterest: true },
  })
}

export async function isWizardStepInArea(
  wizardStepId: string,
  areaOfInterest: AreaOfInterest
) {
  const step = await db.applicationWizardStep.findFirst({
    where: {
      id: wizardStepId,
      wizard: {
        areaOfInterest,
        isDeleted: false,
        isActive: true,
      },
    },
    select: { id: true },
  })
  return Boolean(step)
}

export function mergedApplicationDisplayName(areaOfInterest: string) {
  const labels: Record<string, string> = {
    CR: 'Company Registration (CR)',
    PR: 'Premium Residency (PR)',
    GR: 'General Services (GR)',
  }
  const label = labels[areaOfInterest] ?? areaOfInterest
  return `${label} — full application`
}
