import { execFile } from 'child_process'
import { promisify } from 'util'
import type { CustomDatabaseEngine } from './database-provider'

const execFileAsync = promisify(execFile)
const SEED_TIMEOUT_MS = 60_000

export interface SeedResult {
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

/** Runs prisma/seed.ts against an arbitrary database URL (creates the default admin account,
 *  RBAC roles, and sample data) — without touching the running app's own env. */
export async function seedDatabase(
  engine: CustomDatabaseEngine,
  url: string,
  secretsToRedact: string[] = []
): Promise<SeedResult> {
  const env: NodeJS.ProcessEnv =
    engine === 'sqlite'
      ? { ...process.env, SEED_ENGINE: 'sqlite', SQLITE_DATABASE_URL: url }
      : { ...process.env, SEED_ENGINE: 'postgresql', DATABASE_URL: url }

  try {
    // shell: true is required on Windows — npx resolves to npx.cmd there, and execFile
    // can't spawn .cmd files directly (fails with EINVAL) without going through a shell.
    const { stdout, stderr } = await execFileAsync('npx', ['tsx', 'prisma/seed.ts'], {
      cwd: process.cwd(),
      env,
      timeout: SEED_TIMEOUT_MS,
      windowsHide: true,
      shell: true,
    })
    return { success: true, output: sanitize((stdout || stderr || '').trim(), secretsToRedact) }
  } catch (error: any) {
    const raw = [error?.stdout, error?.stderr].filter(Boolean).join('\n').trim() || error?.message || 'Failed to seed database'
    return { success: false, error: sanitize(raw, secretsToRedact) }
  }
}
