import { execFile } from 'child_process'
import { promisify } from 'util'
import type { CustomDatabaseEngine } from './database-provider'

const execFileAsync = promisify(execFile)
const PUSH_TIMEOUT_MS = 60_000

export interface SchemaPushResult {
  success: boolean
  output?: string
  error?: string
}

function sanitize(message: string, secrets: string[]): string {
  let out = message
  for (const secret of secrets) {
    if (secret) out = out.split(secret).join('••••••••')
  }
  return out
}

/** Runs `prisma db push` against an arbitrary database URL, without touching the running app's own env. */
export async function pushSchemaToDatabase(
  engine: CustomDatabaseEngine,
  url: string,
  secretsToRedact: string[] = []
): Promise<SchemaPushResult> {
  const schemaPath = engine === 'sqlite' ? 'prisma/schema.sqlite.prisma' : 'prisma/schema.prisma'
  const envVarName = engine === 'sqlite' ? 'SQLITE_DATABASE_URL' : 'DATABASE_URL'

  try {
    // shell: true is required on Windows — npx resolves to npx.cmd there, and execFile
    // can't spawn .cmd files directly (fails with EINVAL) without going through a shell.
    const { stdout, stderr } = await execFileAsync(
      'npx',
      ['prisma', 'db', 'push', '--schema', schemaPath, '--skip-generate'],
      {
        cwd: process.cwd(),
        env: { ...process.env, [envVarName]: url },
        timeout: PUSH_TIMEOUT_MS,
        windowsHide: true,
        shell: true,
      }
    )
    return { success: true, output: sanitize((stdout || stderr || '').trim(), secretsToRedact) }
  } catch (error: any) {
    const raw = [error?.stdout, error?.stderr].filter(Boolean).join('\n').trim() || error?.message || 'Failed to push schema'
    return { success: false, error: sanitize(raw, secretsToRedact) }
  }
}
