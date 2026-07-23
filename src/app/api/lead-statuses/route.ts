import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'

// Default lead statuses – always ensured when fetching so they appear on Lead Statuses page
const DEFAULT_LEAD_STATUSES = [
  { name: 'New', color: '#2563eb', type: 'OPEN' as const },
  { name: 'Contacted', color: '#8b5cf6', type: 'OPEN' as const },
  { name: 'Qualified', color: '#f97316', type: 'OPEN' as const },
  { name: 'Converted', color: '#16a34a', type: 'WON' as const },
]

// GET /api/lead-statuses - list all lead statuses with lead counts (ensures defaults exist)
export const GET = withAuth(async () => {
  // Ensure default statuses exist (upsert each so we never return empty)
  for (const status of DEFAULT_LEAD_STATUSES) {
    await db.leadStatus.upsert({
      where: { name: status.name },
      update: { color: status.color, type: status.type },
      create: { name: status.name, color: status.color, type: status.type },
    })
  }

  const statuses = await db.leadStatus.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: { leads: true },
      },
    },
  })

  return NextResponse.json({ statuses })
})

// POST /api/lead-statuses - create new status
export const POST = withAuth(async (request) => {
  const body = await request.json()
  const { name, color } = body as {
    name: string
    color: string
  }

  if (!name || !color) {
    return NextResponse.json(
      { error: 'Name and color are required' },
      { status: 400 }
    )
  }

  const status = await db.leadStatus.create({
    data: {
      name,
      color,
      type: 'OPEN',
    },
  })

  return NextResponse.json({ status }, { status: 201 })
})


