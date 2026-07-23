import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withPermission } from '@/lib/rbac-middleware'
import { Module, Action, type Permission } from '@/lib/rbac'

export const GET = withPermission(
  [`${Module.AUDIT}.${Action.VIEW}` as Permission]
)(async (request) => {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20', 10))

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 })
    }

    const where = { entityType, entityId }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    })
})
