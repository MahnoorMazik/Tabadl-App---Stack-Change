import { NextResponse } from 'next/server'
import { AuthenticatedRequest, withAuth } from '@/lib/rbac-middleware'
import { db } from '@/lib/db'
import { getActiveDatabaseProvider, getActiveCustomConfigSummary } from '@/lib/database-provider'
import { listTables } from '@/lib/database-introspect'

function canManageDatabase(user: NonNullable<AuthenticatedRequest['user']>) {
  return user.role === 'STAFF' && user.permissions?.includes('settings.manage')
}

export const GET = withAuth(async (request) => {
  if (!canManageDatabase(request.user!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const provider = getActiveDatabaseProvider()
  const customSummary = getActiveCustomConfigSummary()
  const engine = provider === 'sqlite' ? 'sqlite' : provider === 'custom' ? (customSummary?.engine ?? 'postgresql') : 'postgresql'

  try {
    const tables = await listTables(db, engine)
    return NextResponse.json({ success: true, tables })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to list tables' })
  }
})
