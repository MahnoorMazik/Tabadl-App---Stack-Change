import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { restoreLeadCascade } from '@/lib/soft-delete-cascade'

// POST /api/leads/[id]/restore - Restore a soft-deleted lead and its documents
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

  if (!user.permissions?.includes('leads.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params

    const lead = await db.lead.findFirst({
      where: { id, isDeleted: true },
      select: { id: true },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Deleted lead not found' },
        { status: 404 }
      )
    }

    await db.$transaction(async (tx) => {
      await restoreLeadCascade(tx, lead.id)
    })

    return NextResponse.json({ message: 'Lead restored successfully' })
  } catch (error) {
    console.error('Error restoring lead:', error)
    return NextResponse.json(
      { error: 'Failed to restore lead' },
      { status: 500 }
    )
  }
}


