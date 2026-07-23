import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { Module, Action, PermissionChecker, type Permission } from '@/lib/rbac'
import { servicePackageSchema } from '@/lib/validations/services'
import { uniqueSlug, syncPackageServices } from '@/lib/business-workflow/utils'
import { calculatePhaseAmounts } from '@/lib/business-workflow/catalog'
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
  const pkg = await db.servicePackage.findUnique({
    where: { id },
    include: {
      services: { include: { service: { select: { id: true, name: true, sortOrder: true } } } },
    },
  })

  if (!pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  return NextResponse.json({
    package: {
      ...pkg,
      serviceIds: pkg.services.map((s) => s.serviceId),
      services: pkg.services.map((s) => s.service),
      paymentSchedule: calculatePhaseAmounts(pkg.basePriceSar),
    },
  })
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
    const body = servicePackageSchema.parse(await request.json())

    const existing = await db.servicePackage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const slug =
      body.name !== existing.name
        ? await uniqueSlug('servicePackage', body.name, id)
        : existing.slug

    const pkg = await db.servicePackage.update({
      where: { id },
      data: {
        name: body.name,
        slug,
        description: body.description ?? null,
        basePriceSar: body.basePriceSar,
        basePriceUsd: body.basePriceUsd,
        isFeatured: body.isFeatured ?? existing.isFeatured,
        isActive: body.isActive ?? existing.isActive,
        sortOrder: body.sortOrder ?? existing.sortOrder,
      },
    })

    if (body.serviceIds !== undefined) {
      await syncPackageServices(id, body.serviceIds)
    }

    const links = await db.packageService.findMany({
      where: { packageId: id },
      include: { service: { select: { id: true, name: true, sortOrder: true } } },
    })

    return NextResponse.json({
      package: {
        ...pkg,
        serviceIds: links.map((l) => l.serviceId),
        services: links.map((l) => l.service),
        paymentSchedule: calculatePhaseAmounts(pkg.basePriceSar),
      },
    })
  } catch (error) {
    console.error('[Admin Packages PUT]', error)
    return NextResponse.json({ error: 'Failed to update package' }, { status: 500 })
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
    const existing = await db.servicePackage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    await db.servicePackage.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Packages DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete package' }, { status: 500 })
  }
}
