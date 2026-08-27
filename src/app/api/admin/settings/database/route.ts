import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthenticatedRequest, withAuth } from '@/lib/rbac-middleware'
import {
  getActiveDatabaseProvider,
  getDatabaseProviderStatus,
  setActiveDatabaseProvider,
  type DatabaseProvider,
} from '@/lib/database-provider'

const updateSchema = z.object({
  provider: z.enum(['neon', 'supabase', 'sqlite']),
})

function canManageDatabase(user: NonNullable<AuthenticatedRequest['user']>) {
  return user.role === 'STAFF' && user.permissions?.includes('settings.manage')
}

export const GET = withAuth(async (request) => {
  if (!canManageDatabase(request.user!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    activeProvider: getActiveDatabaseProvider(),
    providers: getDatabaseProviderStatus(),
  })
})

export const PUT = withAuth(async (request) => {
  if (!canManageDatabase(request.user!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid database provider' }, { status: 400 })
  }

  try {
    const activeProvider = setActiveDatabaseProvider(parsed.data.provider as DatabaseProvider)
    return NextResponse.json({
      success: true,
      activeProvider,
      providers: getDatabaseProviderStatus(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change database provider'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
