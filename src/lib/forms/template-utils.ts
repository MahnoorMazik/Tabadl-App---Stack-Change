import { db } from '@/lib/db'
import {
  DuplicateFieldIdsError,
  FormTemplateFieldInput,
  normalizeTemplateFields,
} from '@/lib/validations/forms'

export async function assertFieldsExist(fieldIds: string[]) {
  const uniqueIds = [...new Set(fieldIds)]
  const existing = await db.formField.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  })
  if (existing.length !== uniqueIds.length) {
    const found = new Set(existing.map((f) => f.id))
    const missing = uniqueIds.filter((id) => !found.has(id))
    return { ok: false as const, missing }
  }
  return { ok: true as const }
}

export async function assertServicesExist(serviceIds: string[]) {
  const uniqueIds = [...new Set(serviceIds)]
  if (uniqueIds.length === 0) return { ok: true as const }

  const existing = await db.businessService.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
    select: { id: true },
  })
  if (existing.length !== uniqueIds.length) {
    const found = new Set(existing.map((s) => s.id))
    const missing = uniqueIds.filter((id) => !found.has(id))
    return { ok: false as const, missing }
  }
  return { ok: true as const }
}

/**
 * Ensure none of the given services are already assigned to another (non-deleted) template.
 * excludeTemplateId allows re-saving the current template's own assignments.
 */
export async function assertServicesAvailable(
  serviceIds: string[],
  excludeTemplateId?: string
) {
  const uniqueIds = [...new Set(serviceIds)]
  if (uniqueIds.length === 0) return { ok: true as const, conflicts: [] }

  const conflicts = await db.formTemplateService.findMany({
    where: {
      serviceId: { in: uniqueIds },
      ...(excludeTemplateId ? { templateId: { not: excludeTemplateId } } : {}),
      template: { isDeleted: false },
    },
    include: {
      service: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
    },
  })

  if (conflicts.length > 0) {
    return { ok: false as const, conflicts }
  }
  return { ok: true as const, conflicts: [] }
}

export function prepareTemplateFields(fields: FormTemplateFieldInput[]) {
  try {
    return { ok: true as const, fields: normalizeTemplateFields(fields) }
  } catch (error) {
    if (error instanceof DuplicateFieldIdsError) {
      return { ok: false as const, duplicateFieldIds: error.fieldIds }
    }
    throw error
  }
}

export async function replaceTemplateRelations(
  templateId: string,
  data: {
    name?: string
    description?: string | null
    areaOfInterest?: 'CR' | 'PR' | null
    isActive?: boolean
    fields?: Array<{
      fieldId: string
      sortOrder: number
      isRequired: boolean
      labelOverride: string | null
    }>
    serviceIds?: string[]
  }
) {
  return db.$transaction(async (tx) => {
    const template = await tx.formTemplate.update({
      where: { id: templateId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.areaOfInterest !== undefined ? { areaOfInterest: data.areaOfInterest } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })

    if (data.fields) {
      await tx.formTemplateField.deleteMany({ where: { templateId } })
      await tx.formTemplateField.createMany({
        data: data.fields.map((f) => ({
          templateId,
          fieldId: f.fieldId,
          sortOrder: f.sortOrder,
          isRequired: f.isRequired,
          labelOverride: f.labelOverride,
        })),
      })
    }

    if (data.serviceIds) {
      await tx.formTemplateService.deleteMany({ where: { templateId } })
      if (data.serviceIds.length > 0) {
        await tx.formTemplateService.createMany({
          data: data.serviceIds.map((serviceId) => ({
            templateId,
            serviceId,
          })),
        })
      }
    }

    return template
  })
}

export async function getTemplateDetail(id: string) {
  return db.formTemplate.findFirst({
    where: { id, isDeleted: false },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      fields: {
        orderBy: { sortOrder: 'asc' },
        include: {
          field: true,
        },
      },
      services: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
        },
      },
    },
  })
}
