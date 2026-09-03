import { z } from 'zod'

const sslModeSchema = z.enum(['disable', 'require'])

const postgresVariablesSchema = z.object({
  method: z.literal('variables'),
  host: z.string().trim().min(1, 'Host is required'),
  port: z.string().trim().regex(/^\d+$/, 'Port must be numeric'),
  database: z.string().trim().min(1, 'Database name is required'),
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  sslMode: sslModeSchema,
})

const postgresUrlSchema = z.object({
  method: z.literal('url'),
  connectionUrl: z
    .string()
    .trim()
    .regex(/^postgres(ql)?:\/\/[^\s:]+:[^\s@]*@[^\s:/]+:\d+\/[^\s?]+/i, 'Invalid PostgreSQL connection string'),
})

const sqliteConfigSchema = z.object({
  path: z.string().trim().min(1, 'Database path is required'),
})

export const customDatabaseInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('sqlite'), config: sqliteConfigSchema }),
  z.object({ type: z.literal('postgresql'), config: z.discriminatedUnion('method', [postgresVariablesSchema, postgresUrlSchema]) }),
])

export type CustomDatabaseInput = z.infer<typeof customDatabaseInputSchema>

export interface BuiltConnection {
  url: string
  label: string
  /** Secret substrings (passwords) that must be redacted from any error message before it reaches the client. */
  secrets: string[]
}

export function buildConnectionUrl(input: CustomDatabaseInput): BuiltConnection {
  if (input.type === 'sqlite') {
    const rawPath = input.config.path.trim()
    const url = rawPath.startsWith('file:') ? rawPath : `file:${rawPath}`
    return { url, label: `SQLite (${rawPath})`, secrets: [] }
  }

  if (input.config.method === 'url') {
    const url = input.config.connectionUrl.trim()
    const password = extractPasswordFromUrl(url)
    return { url, label: 'PostgreSQL (custom connection URL)', secrets: password ? [password] : [] }
  }

  const { host, port, database, username, password, sslMode } = input.config
  const query = sslMode === 'require' ? '?sslmode=require' : ''
  const url = `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}${query}`
  return { url, label: `PostgreSQL (${username}@${host}:${port}/${database})`, secrets: [password] }
}

function extractPasswordFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    return parsed.password ? decodeURIComponent(parsed.password) : undefined
  } catch {
    return undefined
  }
}
