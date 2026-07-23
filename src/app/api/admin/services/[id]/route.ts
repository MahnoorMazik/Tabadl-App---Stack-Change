import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { Module, Action, PermissionChecker, type Permission } from '@/lib/rbac'
import { serviceSchema } from '@/lib/validations/services'
import { uniqueSlug, syncServicePackages } from '@/lib/business-workflow/utils'
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
  const service = await db.businessService.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      packages: { include: { package: { select: { id: true, name: true } } } },
    },
  })

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  return NextResponse.json({
    service: {
      ...service,
      packageIds: service.packages.map((p) => p.packageId),
      packages: service.packages.map((p) => p.package),
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
    const body = serviceSchema.parse(await request.json())

    const existing = await db.businessService.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const slug =
      body.name !== existing.name
        ? await uniqueSlug('businessService', body.name, id)
        : existing.slug

    const service = await db.businessService.update({
      where: { id },
      data: {
        name: body.name,
        slug,
        description: body.description ?? null,
        categoryId: body.categoryId,
        sortOrder: body.sortOrder ?? existing.sortOrder,
        isActive: body.isActive ?? existing.isActive,
      },
      include: { category: { select: { id: true, name: true } } },
    })

    if (body.packageIds !== undefined) {
      await syncServicePackages(id, body.packageIds)
    }

    const packageLinks = await db.packageService.findMany({
      where: { serviceId: id },
      include: { package: { select: { id: true, name: true } } },
    })

    return NextResponse.json({
      service: {
        ...service,
        packageIds: packageLinks.map((p) => p.packageId),
        packages: packageLinks.map((p) => p.package),
      },
    })
  } catch (error) {
    console.error('[Admin Services PUT]', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
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
    const existing = await db.businessService.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    await db.businessService.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Services DELETE]', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
