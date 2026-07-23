import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { UserRole } from '@prisma/client'
import { restoreClientCascade } from '@/lib/soft-delete-cascade'

// POST /api/clients/[id]/restore - Restore a soft-deleted client, its user, and related records
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const { user } = authResult

  if (user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params

    const client = await db.client.findFirst({
      where: { id, isDeleted: true },
      select: { id: true, userId: true },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Deleted client not found' },
        { status: 404 }
      )
    }

    await db.$transaction(async (tx) => {
      await restoreClientCascade(tx, client.id, client.userId)
    })

    return NextResponse.json({ message: 'Client restored successfully' })
  } catch (error) {
    console.error('Error restoring client:', error)
    return NextResponse.json(
      { error: 'Failed to restore client' },
      { status: 500 }
    )
  }
}


