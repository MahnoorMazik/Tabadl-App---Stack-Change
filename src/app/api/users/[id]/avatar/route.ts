import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { Module, Action, PermissionChecker, type Permission } from '@/lib/rbac'
import { StaffType } from '@prisma/client'
import { userDetailSelect } from '@/lib/users/constants'

type RouteContext = { params: Promise<{ id: string }> }

function canUpdate(user: { permissions?: Permission[]; role: string; staffType?: StaffType | null }) {
  const checker = new PermissionChecker(user.permissions || [], user.role as any, user.staffType || StaffType.ADMIN)
  return checker.hasPermission(`${Module.USER_MANAGEMENT}.${Action.UPDATE}`)
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }
  if (!canUpdate(authResult.user)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { id: userId } = await context.params

  try {
    const data = await request.formData()
    const file = data.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    const existingUser = await db.user.findFirst({ where: { id: userId, isDeleted: false } })
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `avatar-${userId.slice(0, 8)}-${Date.now()}.${ext}`

    const uploadsDir = join(process.cwd(), 'uploads')
    const publicDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })
    await mkdir(publicDir, { recursive: true })
    await writeFile(join(uploadsDir, filename), buffer)
    await writeFile(join(publicDir, filename), buffer)

    const updated = await db.user.update({
      where: { id: userId },
      data: { avatar: filename },
      select: userDetailSelect,
    })

    return NextResponse.json({ user: updated, filePath: `/uploads/${filename}` })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }
  if (!canUpdate(authResult.user)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { id: userId } = await context.params

  try {
    const updated = await db.user.update({
      where: { id: userId },
      data: { avatar: null },
      select: userDetailSelect,
    })
    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json({ error: 'Failed to remove avatar' }, { status: 500 })
  }
}
