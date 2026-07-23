import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { calculatePhaseAmounts } from '@/lib/business-workflow/catalog'

export async function GET() {
  try {
    const [categories, packages, addOns, phases] = await Promise.all([
      db.serviceCategory.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          services: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      db.servicePackage.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          services: {
            include: { service: { include: { category: true } } },
          },
        },
      }),
      db.additionalService.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { service: true },
      }),
      db.paymentPhaseTemplate.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    const packagesWithPhases = packages.map((pkg) => ({
      ...pkg,
      services: pkg.services.map((ps) => ps.service),
      paymentSchedule: calculatePhaseAmounts(pkg.basePriceSar),
    }))

    return NextResponse.json({
      categories,
      packages: packagesWithPhases,
      additionalServices: addOns,
      paymentPhases: phases,
    })
  } catch (error) {
    console.error('[Services Catalog]', error)
    return NextResponse.json({ error: 'Failed to load catalog' }, { status: 500 })
  }
}
