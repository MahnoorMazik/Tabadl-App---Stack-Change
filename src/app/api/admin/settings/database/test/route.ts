import { NextResponse } from 'next/server'
import { AuthenticatedRequest, withAuth } from '@/lib/rbac-middleware'
import { customDatabaseInputSchema, buildConnectionUrl } from '@/lib/database-config'
import { testDatabaseConnection } from '@/lib/database-connection-test'

function canManageDatabase(user: NonNullable<AuthenticatedRequest['user']>) {
  return user.role === 'STAFF' && user.permissions?.includes('settings.manage')
}

export const POST = withAuth(async (request) => {
  if (!canManageDatabase(request.user!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = customDatabaseInputSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid connection details', details: parsed.error.flatten() }, { status: 400 })
  }

  const { url, secrets } = buildConnectionUrl(parsed.data)
  const result = await testDatabaseConnection(parsed.data.type, url, secrets)

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error })
  }

  return NextResponse.json({ success: true, schemaFound: result.schemaFound })
})
