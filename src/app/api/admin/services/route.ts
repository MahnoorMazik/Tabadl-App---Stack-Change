import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withPermission } from '@/lib/rbac-middleware'
import { Module, Action, type Permission } from '@/lib/rbac'
import { serviceSchema } from '@/lib/validations/services'
import { uniqueSlug, syncServicePackages } from '@/lib/business-workflow/utils'

const viewPerm = [`${Module.SERVICES}.${Action.VIEW}` as Permission]
const createPerm = [`${Module.SERVICES}.${Action.CREATE}` as Permission]

export const GET = withPermission(viewPerm)(async () => {
  try {
    const [categories, services, packages] = await Promise.all([
      db.serviceCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
      db.businessService.findMany({
        orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          packages: { select: { packageId: true, package: { select: { id: true, name: true } } } },
        },
      }),
      db.servicePackage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
    ])

    const mapped = services.map((s) => ({
      ...s,
      packageIds: s.packages.map((p) => p.packageId),
      packages: s.packages.map((p) => p.package),
    }))

    return NextResponse.json({ categories, services: mapped, packages })
  } catch (error) {
    console.error('[Admin Services GET]', error)
    return NextResponse.json({ error: 'Failed to load services' }, { status: 500 })
  }
})

export const POST = withPermission(createPerm)(async (request: NextRequest) => {
  try {
    const body = serviceSchema.parse(await request.json())
    const slug = await uniqueSlug('businessService', body.name)

    const maxOrder = await db.businessService.aggregate({
      where: { categoryId: body.categoryId },
      _max: { sortOrder: true },
    })

    const service = await db.businessService.create({
      data: {
        name: body.name,
        slug,
        description: body.description ?? null,
        categoryId: body.categoryId,
        sortOrder: body.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
        isActive: body.isActive ?? true,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    })

    if (body.packageIds?.length) {
      await syncServicePackages(service.id, body.packageIds)
    }

    const packageLinks = await db.packageService.findMany({
      where: { serviceId: service.id },
      include: { package: { select: { id: true, name: true } } },
    })

    return NextResponse.json({
      service: {
        ...service,
        packageIds: packageLinks.map((p) => p.packageId),
        packages: packageLinks.map((p) => p.package),
      },
    }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: error }, { status: 400 })
    }
    console.error('[Admin Services POST]', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
})
