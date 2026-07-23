import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { Module, Action, PermissionChecker, MAIN_ROLE_NAMES, type Permission } from '@/lib/rbac'
import { StaffType } from '@prisma/client'
import { updateUserSchema } from '@/lib/validations/users'
import { userDetailSelect, isCoreAdmin } from '@/lib/users/constants'
import { softDeleteUserCascade } from '@/lib/soft-delete-cascade'
import { z } from 'zod'

type RouteContext = { params: Promise<{ id: string }> }

function checkPerm(
  user: { permissions?: Permission[]; role: import('@prisma/client').UserRole; staffType?: import('@prisma/client').StaffType | null },
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

  if (!checkPerm(authResult.user, `${Module.USER_MANAGEMENT}.${Action.VIEW}`)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { id: userId } = await context.params

  try {
    const targetUser = await db.user.findFirst({
      where: { id: userId, isDeleted: false },
      select: userDetailSelect,
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: targetUser })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const actor = authResult.user
  if (!checkPerm(actor, `${Module.USER_MANAGEMENT}.${Action.UPDATE}`)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { id: userId } = await context.params

  try {
    const body = await request.json()
    const data = updateUserSchema.parse(body)

    const existingUser = await db.user.findFirst({
      where: { id: userId, isDeleted: false },
      include: { customRole: true },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const coreAdmin = isCoreAdmin(existingUser.email)

    if (data.email && data.email !== existingUser.email) {
      const emailExists = await db.user.findFirst({
        where: { email: data.email, isDeleted: false, NOT: { id: userId } },
      })
      if (emailExists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
      }
    }

    if (data.customRoleId && data.customRoleId !== existingUser.customRoleId) {
      const targetRole = await db.role.findUnique({ where: { id: data.customRoleId } })
      if (targetRole?.name === MAIN_ROLE_NAMES.ADMIN && actor.staffType !== StaffType.ADMIN) {
        return NextResponse.json({ error: 'Only administrators can assign the Admin role' }, { status: 403 })
      }
    }

    if (coreAdmin && data.isActive === false) {
      return NextResponse.json({ error: 'Core admin cannot be deactivated' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    let invalidateSessions = false

    if (coreAdmin) {
      if (data.email) updateData.email = data.email
      if (data.password?.trim()) {
        const { hashPassword } = await import('@/lib/password')
        updateData.passwordHash = await hashPassword(data.password)
        invalidateSessions = true
      }
    } else {
      if (data.name) updateData.name = data.name
      if (data.email) updateData.email = data.email
      if (data.staffType !== undefined) updateData.staffType = data.staffType
      if (data.customRoleId !== undefined) {
        updateData.customRoleId = data.customRoleId || null
        invalidateSessions = true
      }
      if (data.phone !== undefined) updateData.phone = data.phone || null
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive
        invalidateSessions = true
      }
      if (data.role !== undefined) updateData.role = data.role
      if (data.password?.trim()) {
        const { hashPassword } = await import('@/lib/password')
        updateData.passwordHash = await hashPassword(data.password)
        invalidateSessions = true
      }
    }

    if (invalidateSessions) {
      updateData.tokenVersion = { increment: 1 }
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: userDetailSelect,
    })

    const { logUpdateActivity } = await import('@/lib/activity-tracking')
    await logUpdateActivity(
      { userId: actor.userId },
      'User',
      userId,
      updatedUser.name ?? updatedUser.email,
      {
        email: existingUser.email,
        name: existingUser.name,
        isActive: existingUser.isActive,
        customRoleId: existingUser.customRoleId,
      },
      updateData,
      request
    )

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Validation failed' }, { status: 400 })
    }
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const actor = authResult.user
  if (!checkPerm(actor, `${Module.USER_MANAGEMENT}.${Action.DELETE}`)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { id: userId } = await context.params

  try {
    const existingUser = await db.user.findFirst({
      where: { id: userId, isDeleted: false },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (isCoreAdmin(existingUser.email)) {
      return NextResponse.json({ error: 'Core admin user cannot be deleted' }, { status: 403 })
    }

    if (existingUser.id === actor.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 })
    }

    await db.$transaction(async (tx) => {
      await softDeleteUserCascade(tx, userId)
    })

    const { logDeleteActivity } = await import('@/lib/activity-tracking')
    await logDeleteActivity(
      { userId: actor.userId },
      'User',
      userId,
      existingUser.name ?? existingUser.email,
      { email: existingUser.email, role: existingUser.role },
      request
    )

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
