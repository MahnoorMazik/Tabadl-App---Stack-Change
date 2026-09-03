import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthenticatedRequest, withAuth } from '@/lib/rbac-middleware'
import {
  getActiveDatabaseProvider,
  getActiveCustomConfigSummary,
  getDatabaseProviderStatus,
  setActiveDatabaseProvider,
  saveAndActivateCustomDatabase,
  type DatabaseProvider,
} from '@/lib/database-provider'
import { customDatabaseInputSchema, buildConnectionUrl } from '@/lib/database-config'
import { testDatabaseConnection } from '@/lib/database-connection-test'
import { pushSchemaToDatabase } from '@/lib/database-schema-push'
import { seedDatabase } from '@/lib/database-seed'

const switchSchema = z.object({
  provider: z.enum(['neon', 'supabase', 'local', 'sqlite']),
})

const saveCustomSchema = z.object({
  provider: z.literal('custom'),
  type: z.enum(['postgresql', 'sqlite']),
  config: z.any(),
})

function canManageDatabase(user: NonNullable<AuthenticatedRequest['user']>) {
  return user.role === 'STAFF' && user.permissions?.includes('settings.manage')
}

function currentStatePayload() {
  return {
    activeProvider: getActiveDatabaseProvider(),
    customConfig: getActiveCustomConfigSummary(),
    providers: getDatabaseProviderStatus(),
  }
}

export const GET = withAuth(async (request) => {
  if (!canManageDatabase(request.user!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(currentStatePayload())
})

export const PUT = withAuth(async (request) => {
  if (!canManageDatabase(request.user!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  const customAttempt = saveCustomSchema.safeParse(body)
  if (customAttempt.success) {
    const parsedCustom = customDatabaseInputSchema.safeParse({
      type: customAttempt.data.type,
      config: customAttempt.data.config,
    })
    if (!parsedCustom.success) {
      return NextResponse.json({ error: 'Invalid connection details', details: parsedCustom.error.flatten() }, { status: 400 })
    }

    const { url, label, secrets } = buildConnectionUrl(parsedCustom.data)
    const engine = parsedCustom.data.type

    // Never switch to a database we can't actually reach — this is what used to silently
    // activate a broken connection.
    const testResult = await testDatabaseConnection(engine, url, secrets)
    if (!testResult.success) {
      return NextResponse.json({ error: testResult.error || 'Could not connect to the database' }, { status: 400 })
    }

    let schemaInitialized = false
    if (!testResult.schemaFound) {
      const pushResult = await pushSchemaToDatabase(engine, url, secrets)
      if (!pushResult.success) {
        return NextResponse.json(
          { error: `Connected, but failed to create the database schema: ${pushResult.error}` },
          { status: 400 }
        )
      }
      const seedResult = await seedDatabase(engine, url, secrets)
      if (!seedResult.success) {
        return NextResponse.json(
          { error: `Schema created, but failed to seed the default admin account: ${seedResult.error}` },
          { status: 400 }
        )
      }
      schemaInitialized = true
    }

    try {
      saveAndActivateCustomDatabase(engine, url, label)
      return NextResponse.json({ ...currentStatePayload(), schemaInitialized })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save database configuration'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const parsedSwitch = switchSchema.safeParse(body)
  if (!parsedSwitch.success) {
    return NextResponse.json({ error: 'Invalid database provider' }, { status: 400 })
  }

  try {
    setActiveDatabaseProvider(parsedSwitch.data.provider as DatabaseProvider)
    return NextResponse.json(currentStatePayload())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change database provider'
    return NextResponse.json({ error: message }, { status: 400 })
  }
})
