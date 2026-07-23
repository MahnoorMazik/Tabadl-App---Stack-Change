import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/rbac-middleware'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const groupSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  color: z.string().optional(),
})

const DEFAULT_CLIENT_GROUPS = [
  { name: 'Normal', description: 'Standard clients', color: '#6b7280' },
  { name: 'Priority', description: 'Priority clients', color: '#f59e0b' },
  { name: 'Urgent', description: 'Urgent clients', color: '#ef4444' },
]

// GET /api/client-groups - Get all client groups (ensures default system groups exist)
export const GET = withAuth(async (request) => {
  const user = request.user!

  if (user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    for (const g of DEFAULT_CLIENT_GROUPS) {
      const existing = await db.clientGroup.findFirst({
        where: { name: g.name, isDeleted: false },
      })
      if (!existing) {
        await db.clientGroup.create({
          data: { name: g.name, description: g.description, color: g.color },
        })
      }
    }

    const groups = await db.clientGroup.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: {
            clients: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ groups })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
})

// POST /api/client-groups - Create new group
export const POST = withAuth(async (request) => {
  const user = request.user!

  if (user.role !== UserRole.STAFF) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = groupSchema.parse(body)

    const group = await db.clientGroup.create({
      data,
      include: {
        _count: {
          select: {
            clients: true,
          },
        },
      },
    })

    return NextResponse.json({ group }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    )
  }
})

