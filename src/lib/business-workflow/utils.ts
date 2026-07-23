import { db } from '@/lib/db'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type SlugModel = 'businessService' | 'servicePackage' | 'additionalService' | 'serviceCategory'

export async function uniqueSlug(
  model: SlugModel,
  base: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = slugify(base) || 'item'
  let candidate = baseSlug
  let counter = 0

  while (true) {
    if (counter > 0) candidate = `${baseSlug}-${counter}`

    const where: Record<string, unknown> = { slug: candidate }
    if (excludeId) where.NOT = { id: excludeId }

    let exists = false
    switch (model) {
      case 'businessService':
        exists = !!(await db.businessService.findFirst({ where }))
        break
      case 'servicePackage':
        exists = !!(await db.servicePackage.findFirst({ where }))
        break
      case 'additionalService':
        exists = !!(await db.additionalService.findFirst({ where }))
        break
      case 'serviceCategory':
        exists = !!(await db.serviceCategory.findFirst({ where }))
        break
    }

    if (!exists) return candidate
    counter++
  }
}

export async function syncServicePackages(serviceId: string, packageIds: string[]) {
  await db.packageService.deleteMany({ where: { serviceId } })
  if (packageIds.length === 0) return

  const validPackages = await db.servicePackage.findMany({
    where: { id: { in: packageIds }, isActive: true },
    select: { id: true },
  })

  await db.packageService.createMany({
    data: validPackages.map((p) => ({ packageId: p.id, serviceId })),
    skipDuplicates: true,
  })
}

export async function syncPackageServices(packageId: string, serviceIds: string[]) {
  await db.packageService.deleteMany({ where: { packageId } })
  if (serviceIds.length === 0) return

  const validServices = await db.businessService.findMany({
    where: { id: { in: serviceIds }, isActive: true },
    select: { id: true },
  })

  await db.packageService.createMany({
    data: validServices.map((s) => ({ packageId, serviceId: s.id })),
    skipDuplicates: true,
  })
}
