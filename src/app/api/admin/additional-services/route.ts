import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withPermission } from '@/lib/rbac-middleware'
import { Module, Action, type Permission } from '@/lib/rbac'
import { additionalServiceSchema } from '@/lib/validations/services'
import { uniqueSlug } from '@/lib/business-workflow/utils'

const viewPerm = [`${Module.SERVICES}.${Action.VIEW}` as Permission]
const createPerm = [`${Module.SERVICES}.${Action.CREATE}` as Permission]

export const GET = withPermission(viewPerm)(async () => {
  try {
    const addOns = await db.additionalService.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { service: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ addOns })
  } catch (error) {
    console.error('[Admin Add-ons GET]', error)
    return NextResponse.json({ error: 'Failed to load add-ons' }, { status: 500 })
  }
})

export const POST = withPermission(createPerm)(async (request: NextRequest) => {
  try {
    const body = additionalServiceSchema.parse(await request.json())
    const slug = await uniqueSlug('additionalService', body.name)

    const maxOrder = await db.additionalService.aggregate({ _max: { sortOrder: true } })

    const addOn = await db.additionalService.create({
      data: {
        name: body.name,
        slug,
        description: body.description ?? null,
        priceSar: body.priceSar,
        priceUsd: body.priceUsd,
        serviceId: body.serviceId || null,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      },
      include: { service: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ addOn }, { status: 201 })
  } catch (error) {
    console.error('[Admin Add-ons POST]', error)
    return NextResponse.json({ error: 'Failed to create add-on' }, { status: 500 })
  }
})
