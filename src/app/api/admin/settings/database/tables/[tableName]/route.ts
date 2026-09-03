import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/rbac-middleware'
import { db } from '@/lib/db'
import { getActiveDatabaseProvider, getActiveCustomConfigSummary } from '@/lib/database-provider'
import { listTables } from '@/lib/database-introspect'
import { getTableData } from '@/lib/database-table-data'

const MAX_PAGE_SIZE = 200
const DEFAULT_PAGE_SIZE = 50

export async function GET(request: NextRequest, context: { params: Promise<{ tableName: string }> }) {
  const authResult = await requireAuth(request)
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }
  if (!(authResult.user.role === 'STAFF' && authResult.user.permissions?.includes('settings.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { tableName } = await context.params
  const url = request.nextUrl
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE))

  const provider = getActiveDatabaseProvider()
  const customSummary = getActiveCustomConfigSummary()
  const engine = provider === 'sqlite' ? 'sqlite' : provider === 'custom' ? (customSummary?.engine ?? 'postgresql') : 'postgresql'

  try {
    // Never trust the URL segment directly — only allow tables the database's own catalog reports.
    const knownTables = await listTables(db, engine)
    if (!knownTables.some((t) => t.name === tableName)) {
      return NextResponse.json({ success: false, error: 'Unknown table' }, { status: 404 })
    }

    const data = await getTableData(db, engine, tableName, page, pageSize)
    return NextResponse.json({ success: true, ...data, page, pageSize })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to load table data' })
  }
}
