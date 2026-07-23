import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withPermission } from '@/lib/rbac-middleware'
import { Module, Action, type Permission } from '@/lib/rbac'
import { servicePackageSchema } from '@/lib/validations/services'
import { uniqueSlug, syncPackageServices } from '@/lib/business-workflow/utils'
import { calculatePhaseAmounts } from '@/lib/business-workflow/catalog'

const viewPerm = [`${Module.SERVICES}.${Action.VIEW}` as Permission]
const createPerm = [`${Module.SERVICES}.${Action.CREATE}` as Permission]

export const GET = withPermission(viewPerm)(async () => {
  try {
    const packages = await db.servicePackage.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        services: {
          include: {
            service: {
              select: { id: true, name: true, sortOrder: true, categoryId: true, isActive: true },
            },
          },
        },
      },
    })

    const mapped = packages.map((pkg) => ({
      ...pkg,
      serviceIds: pkg.services.map((ps) => ps.serviceId),
      services: pkg.services.map((ps) => ps.service).filter((s) => s.isActive),
      paymentSchedule: calculatePhaseAmounts(pkg.basePriceSar),
    }))

    return NextResponse.json({ packages: mapped })
  } catch (error) {
    console.error('[Admin Packages GET]', error)
    return NextResponse.json({ error: 'Failed to load packages' }, { status: 500 })
  }
})

export const POST = withPermission(createPerm)(async (request: NextRequest) => {
  try {
    const body = servicePackageSchema.parse(await request.json())
    const slug = await uniqueSlug('servicePackage', body.name)

    const maxOrder = await db.servicePackage.aggregate({ _max: { sortOrder: true } })

    const pkg = await db.servicePackage.create({
      data: {
        name: body.name,
        slug,
        description: body.description ?? null,
        basePriceSar: body.basePriceSar,
        basePriceUsd: body.basePriceUsd,
        isFeatured: body.isFeatured ?? false,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
    })

    if (body.serviceIds?.length) {
      await syncPackageServices(pkg.id, body.serviceIds)
    }

    const links = await db.packageService.findMany({
      where: { packageId: pkg.id },
      include: { service: { select: { id: true, name: true, sortOrder: true } } },
    })

    return NextResponse.json({
      package: {
        ...pkg,
        serviceIds: links.map((l) => l.serviceId),
        services: links.map((l) => l.service),
        paymentSchedule: calculatePhaseAmounts(pkg.basePriceSar),
      },
    }, { status: 201 })
  } catch (error) {
    console.error('[Admin Packages POST]', error)
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
  }
})
