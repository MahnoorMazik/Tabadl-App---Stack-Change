import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth/config'
import { withPermission } from '@/lib/rbac-middleware'
import { Module, Action, type Permission } from '@/lib/rbac'
import { getClientIp, logPageAccess } from '@/lib/pageAccessLog'
import { shouldTrackAdminPageAccess } from '@/lib/adminPageTitles'

const bodySchema = z.object({
  path: z.string().min(1).max(500),
  pageTitle: z.string().max(200).optional(),
  referer: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { path, pageTitle, referer } = parsed.data
  if (!shouldTrackAdminPageAccess(path)) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    await logPageAccess({
      userId: session.user.id,
      path,
      pageTitle,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') || undefined,
      referer,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[PageAccessLog] Failed:', error)
    return NextResponse.json({ error: 'Failed to log page access' }, { status: 500 })
  }
}

export const GET = withPermission(
  [`${Module.AUDIT}.${Action.VIEW}` as Permission]
)(async (request) => {
    const { searchParams } = request.nextUrl
    const userIdParam = searchParams.get('userId')
    const path = searchParams.get('path')?.trim() || ''
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const where: Record<string, unknown> = {}

    if (userIdParam && userIdParam !== 'all') {
      where.userId = userIdParam
    }
    if (path) {
      where.path = { contains: path }
    }
    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {}
      if (dateFrom) {
        const d = new Date(dateFrom)
        if (!Number.isNaN(d.getTime())) createdAt.gte = d
      }
      if (dateTo) {
        const d = new Date(dateTo)
        if (!Number.isNaN(d.getTime())) createdAt.lte = d
      }
      if (Object.keys(createdAt).length > 0) where.createdAt = createdAt
    }

    const [logs, total] = await Promise.all([
      db.pageAccessLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.pageAccessLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    })
})
