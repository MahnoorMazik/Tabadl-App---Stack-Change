import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/rbac-middleware'
import { LeadStatusType } from '@prisma/client'

// PUT /api/lead-statuses/[id] - update a status
export async function PUT(
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

  const { id } = await params
  const body = await request.json()
  const { name, color, type } = body as {
    name?: string
    color?: string
    type?: LeadStatusType
  }

  const existing = await db.leadStatus.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Status not found' }, { status: 404 })
  }

  // Protect system statuses by name
  if (existing.name === 'New' || existing.name === 'Converted') {
    return NextResponse.json(
      { error: 'System status cannot be edited.' },
      { status: 400 }
    )
  }

  const status = await db.leadStatus.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color }),
      ...(type !== undefined && { type }),
    },
  })

  return NextResponse.json({ status })
}

// DELETE /api/lead-statuses/[id] - delete a status after reassigning leads
export async function DELETE(
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

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const { targetStatusId } = body as { targetStatusId?: string }

  const existing = await db.leadStatus.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Status not found' }, { status: 404 })
  }

  // Protect system statuses by name
  if (existing.name === 'New' || existing.name === 'Converted') {
    return NextResponse.json(
      { error: 'System status cannot be deleted.' },
      { status: 400 }
    )
  }

  // Count leads currently using this status
  const leadCount = await db.lead.count({
    where: { statusId: id },
  })

  if (leadCount > 0 && !targetStatusId) {
    return NextResponse.json(
      {
        error: 'targetStatusId is required when deleting a status that is in use',
        leadCount,
      },
      { status: 400 }
    )
  }

  // Reassign leads if needed
  if (leadCount > 0 && targetStatusId) {
    await db.lead.updateMany({
      where: { statusId: id },
      data: { statusId: targetStatusId },
    })
  }

  await db.leadStatus.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}


