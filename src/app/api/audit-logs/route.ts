import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withPermission } from '@/lib/rbac-middleware'
import { Module, Action, type Permission } from '@/lib/rbac'

export const GET = withPermission(
  [`${Module.AUDIT}.${Action.VIEW}` as Permission]
)(async (request) => {
    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get('userId') || ''
    const entity = searchParams.get('entity') || ''
    const action = searchParams.get('action') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '50', 10))

    const where: Record<string, unknown> = {}

    if (userIdParam && userIdParam !== 'all') {
      where.userId = userIdParam
    }
    if (entity && entity !== 'all') {
      where.entityType = entity
    }
    if (action && action !== 'all') {
      where.action = action
    }

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
