import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { restoreUserCascade } from '@/lib/soft-delete-cascade'

// POST /api/users/[id]/restore - Restore a soft-deleted user and related records
export const POST = withAuth(async (request) => {
  const user = request.user!
  const url = new URL(request.url)
  const userId = url.pathname.split('/').slice(-2)[0] // .../users/[id]/restore

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  // Basic safety: only staff/admin users can restore other users
  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const existingUser = await db.user.findFirst({
      where: { id: userId, isDeleted: true },
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Deleted user not found' },
        { status: 404 }
      )
    }

    await db.$transaction(async (tx) => {
      await restoreUserCascade(tx, userId)
    })

    return NextResponse.json({ message: 'User restored successfully' })
  } catch (error) {
    console.error('Restore user error:', error)
    return NextResponse.json(
      { error: 'Failed to restore user' },
      { status: 500 }
    )
  }
})


