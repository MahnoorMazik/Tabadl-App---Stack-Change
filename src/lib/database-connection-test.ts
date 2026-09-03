import { PrismaClient } from '@prisma/client'
import { PrismaClient as SqlitePrismaClient } from '../../.generated/sqlite'
import type { CustomDatabaseEngine } from './database-provider'

export interface ConnectionTestResult {
  success: boolean
  error?: string
  /** false only when the connection succeeded but the app's tables were not found (e.g. a fresh, unmigrated database). */
  schemaFound?: boolean
}

const CONNECT_TIMEOUT_MS = 8000

function sanitizeErrorMessage(message: string, secrets: string[]): string {
  let sanitized = message
  for (const secret of secrets) {
    if (secret) sanitized = sanitized.split(secret).join('••••••••')
  }
  return sanitized
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])
}

export async function testDatabaseConnection(
  engine: CustomDatabaseEngine,
  url: string,
  secretsToRedact: string[] = []
): Promise<ConnectionTestResult> {
  const client: any = engine === 'sqlite'
    ? new SqlitePrismaClient({ datasources: { db: { url } } })
    : new PrismaClient({ datasources: { db: { url } } })

  try {
    await withTimeout(client.$connect(), CONNECT_TIMEOUT_MS, 'Connection timed out. Check the host, port and network access.')

    let schemaFound = true
    try {
      await client.user.findFirst()
    } catch {
      schemaFound = false
    }

    return { success: true, schemaFound }
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Unable to connect to the database'
    return { success: false, error: sanitizeErrorMessage(rawMessage, secretsToRedact) }
  } finally {
    client.$disconnect().catch(() => {})
  }
}
