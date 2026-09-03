import { db } from '@/lib/db'
import {
  SERVICE_CATEGORIES,
  BUSINESS_SERVICES,
  SERVICE_PACKAGES,
  ADDITIONAL_SERVICES,
  PAYMENT_PHASES,
  PROFILE_REQUIREMENTS,
} from '@/lib/business-workflow/catalog'

/** `client` defaults to the app's own dynamic active-database proxy. Pass an explicit client
 *  (e.g. from prisma/seed.ts targeting a specific engine/URL) to seed a database that isn't
 *  necessarily the one currently active. */
export async function seedBusinessWorkflow(client: any = db) {
  console.log('🌱 Seeding business workflow catalog...')

  for (const cat of SERVICE_CATEGORIES) {
    await client.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: { name: cat.name, slug: cat.slug, sortOrder: cat.sortOrder },
    })
  }

  const categories = await client.serviceCategory.findMany()
  const catBySlug = Object.fromEntries(categories.map((c: any) => [c.slug, c.id]))

  for (const svc of BUSINESS_SERVICES) {
    await client.businessService.upsert({
      where: { slug: svc.slug },
      update: {
        name: svc.name,
        categoryId: catBySlug[svc.category],
        sortOrder: svc.sortOrder,
      },
      create: {
        name: svc.name,
        slug: svc.slug,
        categoryId: catBySlug[svc.category],
        sortOrder: svc.sortOrder,
      },
    })
  }

  const allServices = await client.businessService.findMany()
  const svcBySlug = Object.fromEntries(allServices.map((s: any) => [s.slug, s.id]))

  for (const pkg of SERVICE_PACKAGES) {
    const saved = await client.servicePackage.upsert({
      where: { slug: pkg.slug },
      update: {
        name: pkg.name,
        description: pkg.description,
        basePriceUsd: pkg.basePriceUsd,
        basePriceSar: pkg.basePriceSar,
        sortOrder: pkg.sortOrder,
        isFeatured: 'isFeatured' in pkg ? pkg.isFeatured : false,
      },
      create: {
        name: pkg.name,
        slug: pkg.slug,
        description: pkg.description,
        basePriceUsd: pkg.basePriceUsd,
        basePriceSar: pkg.basePriceSar,
        sortOrder: pkg.sortOrder,
        isFeatured: 'isFeatured' in pkg ? pkg.isFeatured : false,
      },
    })

    await client.packageService.deleteMany({ where: { packageId: saved.id } })
    for (const slug of pkg.serviceSlugs) {
      const serviceId = svcBySlug[slug]
      if (serviceId) {
        await client.packageService.create({ data: { packageId: saved.id, serviceId } })
      }
    }
  }

  for (const [i, addOn] of ADDITIONAL_SERVICES.entries()) {
    await client.additionalService.upsert({
      where: { slug: addOn.slug },
      update: {
        name: addOn.name,
        description: addOn.description,
        priceUsd: addOn.priceUsd,
        priceSar: addOn.priceSar,
        sortOrder: i + 1,
        serviceId: addOn.linkedService ? svcBySlug[addOn.linkedService] ?? null : null,
      },
      create: {
        name: addOn.name,
        slug: addOn.slug,
        description: addOn.description,
        priceUsd: addOn.priceUsd,
        priceSar: addOn.priceSar,
        sortOrder: i + 1,
        serviceId: addOn.linkedService ? svcBySlug[addOn.linkedService] ?? null : null,
      },
    })
  }

  for (const phase of PAYMENT_PHASES) {
    await client.paymentPhaseTemplate.upsert({
      where: { phaseNumber: phase.phaseNumber },
      update: {
        name: phase.name,
        description: phase.description,
        percentage: phase.percentage,
        sortOrder: phase.phaseNumber,
      },
      create: {
        phaseNumber: phase.phaseNumber,
        name: phase.name,
        description: phase.description,
        percentage: phase.percentage,
        sortOrder: phase.phaseNumber,
      },
    })
  }

  for (const req of PROFILE_REQUIREMENTS) {
    await client.profileDocumentRequirement.upsert({
      where: { code: req.code },
      update: {
        name: req.name,
        description: req.description,
        inputType: req.inputType,
        isRequired: req.isRequired,
        sortOrder: req.sortOrder,
      },
      create: {
        code: req.code,
        name: req.name,
        description: req.description,
        inputType: req.inputType,
        isRequired: req.isRequired,
        sortOrder: req.sortOrder,
      },
    })
  }

  console.log('✅ Business workflow catalog seeded')
}
