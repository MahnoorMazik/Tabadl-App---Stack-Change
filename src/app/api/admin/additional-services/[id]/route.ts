import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { Module, Action, PermissionChecker, type Permission } from '@/lib/rbac'
import { additionalServiceSchema } from '@/lib/validations/services'
import { uniqueSlug } from '@/lib/business-workflow/utils'
import { StaffType } from '@prisma/client'

type RouteContext = { params: Promise<{ id: string }> }

function checkPerm(
  user: { permissions?: Permission[]; role: import('@prisma/client').UserRole; staffType?: StaffType | null },
  perm: Permission
) {
  const checker = new PermissionChecker(user.permissions || [], user.role, user.staffType || StaffType.ADMIN)
  return checker.hasPermission(perm)
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }
  if (!checkPerm(authResult.user, `${Module.SERVICES}.${Action.VIEW}`)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { id } = await context.params
  const addOn = await db.additionalService.findUnique({
    where: { id },
    include: { service: { select: { id: true, name: true } } },
  })

  if (!addOn) {
    return NextResponse.json({ error: 'Add-on not found' }, { status: 404 })
  }

  return NextResponse.json({ addOn })
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }
  if (!checkPerm(authResult.user, `${Module.SERVICES}.${Action.UPDATE}`)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const body = additionalServiceSchema.parse(await request.json())

    const existing = await db.additionalService.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 })
    }

    const slug =
      body.name !== existing.name
        ? await uniqueSlug('additionalService', body.name, id)
        : existing.slug

    const addOn = await db.additionalService.update({
      where: { id },
      data: {
        name: body.name,
        slug,
        description: body.description ?? null,
        priceSar: body.priceSar,
        priceUsd: body.priceUsd,
        serviceId: body.serviceId || null,
        isActive: body.isActive ?? existing.isActive,
        sortOrder: body.sortOrder ?? existing.sortOrder,
      },
      include: { service: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ addOn })
  } catch (error) {
    console.error('[Admin Add-ons PUT]', error)
    return NextResponse.json({ error: 'Failed to update add-on' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }
  if (!checkPerm(authResult.user, `${Module.SERVICES}.${Action.DELETE}`)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const existing = await db.additionalService.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Add-on not found' }, { status: 404 })
    }

    await db.additionalService.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Add-ons DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete add-on' }, { status: 500 })
  }
}
