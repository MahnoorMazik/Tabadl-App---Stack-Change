import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, requireAuth } from '@/lib/rbac-middleware'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const groupSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
})

// PUT /api/client-groups/[id] - Update group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult

  if (user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const data = groupSchema.parse(body)

    const group = await db.clientGroup.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            clients: true,
          },
        },
      },
    })

    return NextResponse.json({ group })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error updating group:', error)
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    )
  }
}

// DELETE /api/client-groups/[id] - Delete group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { user } = authResult

  if (user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params

    // Check if group has clients
    const group = await db.clientGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            clients: true,
          },
        },
      },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group._count.clients > 0) {
      return NextResponse.json(
        { error: 'Cannot delete group with clients. Please reassign or remove clients first.' },
        { status: 400 }
      )
    }

    // Soft delete client group (mark as deleted, keep ID and data)
    await db.clientGroup.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    })

    return NextResponse.json({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    )
  }
}

