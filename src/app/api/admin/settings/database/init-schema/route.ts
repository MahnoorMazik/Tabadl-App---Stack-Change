import { NextResponse } from 'next/server'
import { AuthenticatedRequest, withAuth } from '@/lib/rbac-middleware'
import { customDatabaseInputSchema, buildConnectionUrl } from '@/lib/database-config'
import { testDatabaseConnection } from '@/lib/database-connection-test'
import { pushSchemaToDatabase } from '@/lib/database-schema-push'
import { seedDatabase } from '@/lib/database-seed'

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

  const testResult = await testDatabaseConnection(parsed.data.type, url, secrets)
  if (!testResult.success) {
    return NextResponse.json({ success: false, error: testResult.error || 'Could not connect to the database' })
  }

  const pushResult = await pushSchemaToDatabase(parsed.data.type, url, secrets)
  if (!pushResult.success) {
    return NextResponse.json({ success: false, error: pushResult.error })
  }

  const seedResult = await seedDatabase(parsed.data.type, url, secrets)
  if (!seedResult.success) {
    return NextResponse.json({ success: false, error: `Schema created, but seeding the default admin account failed: ${seedResult.error}` })
  }

  return NextResponse.json({ success: true, output: pushResult.output })
})
