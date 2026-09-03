import { PrismaClient } from '@prisma/client'
import { PrismaClient as SqlitePrismaClient } from '../../.generated/sqlite'
import fs from 'fs'
import path from 'path'

export const DATABASE_PROVIDERS = ['neon', 'supabase', 'local', 'sqlite', 'custom'] as const
export type DatabaseProvider = (typeof DATABASE_PROVIDERS)[number]

export type CustomDatabaseEngine = 'postgresql' | 'sqlite'

export interface CustomDatabaseConfig {
  engine: CustomDatabaseEngine
  url: string
  label: string
  updatedAt: string
}

type ProviderStatus = {
  provider: DatabaseProvider
  configured: boolean
  supported: boolean
}

type DatabaseState = {
  activeProvider: DatabaseProvider
  customConfig: CustomDatabaseConfig | null
  clients: Partial<Record<DatabaseProvider, PrismaClient | SqlitePrismaClient>>
}

const globalForDatabase = globalThis as typeof globalThis & {
  databaseState?: DatabaseState
}

// Stored outside any switchable database (a DB can't reliably describe "which DB to use about itself").
// Lives under prisma/db, which is already gitignored — never commit real credentials.
const CUSTOM_CONFIG_PATH = path.join(process.cwd(), 'prisma', 'db', 'database-connection.json')

function readStoredCustomConfig(): CustomDatabaseConfig | null {
  try {
    const raw = fs.readFileSync(CUSTOM_CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && (parsed.engine === 'postgresql' || parsed.engine === 'sqlite') && typeof parsed.url === 'string') {
      return parsed as CustomDatabaseConfig
    }
    return null
  } catch {
    return null
  }
}

function writeStoredCustomConfig(config: CustomDatabaseConfig) {
  fs.mkdirSync(path.dirname(CUSTOM_CONFIG_PATH), { recursive: true })
  fs.writeFileSync(CUSTOM_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

function clearStoredCustomConfig() {
  try {
    fs.unlinkSync(CUSTOM_CONFIG_PATH)
  } catch {
    // nothing to clear
  }
}

function getDefaultProvider(customConfig: CustomDatabaseConfig | null): DatabaseProvider {
  const configured = process.env.DATABASE_PROVIDER?.toLowerCase()
  if (configured && configured !== 'custom' && DATABASE_PROVIDERS.includes(configured as DatabaseProvider)) {
    return configured as DatabaseProvider
  }

  if (customConfig) return 'custom'

  if (process.env.SUPABASE_DATABASE_URL) return 'supabase'
  if (process.env.DATABASE_URL?.includes('supabase')) return 'supabase'
  if (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL?.includes('neon.tech')) return 'neon'
  if (process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL) return 'local'
  return 'neon'
}

function getProviderUrl(provider: DatabaseProvider, state: DatabaseState): string | undefined {
  if (provider === 'neon') {
    return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_NEON
  }
  if (provider === 'supabase') {
    return process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL_SUPABASE ||
      (process.env.DATABASE_URL?.includes('supabase') ? process.env.DATABASE_URL : undefined)
  }
  if (provider === 'local') {
    return process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL_LOCAL ||
      (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('neon.tech') && !process.env.DATABASE_URL.includes('supabase.com')
        ? process.env.DATABASE_URL
        : undefined)
  }
  if (provider === 'sqlite') {
    return process.env.SQLITE_DATABASE_URL || process.env.DATABASE_URL_SQLITE
  }
  if (provider === 'custom') {
    return state.customConfig?.url
  }
  return undefined
}

function providerEngine(provider: DatabaseProvider, state: DatabaseState): CustomDatabaseEngine {
  if (provider === 'sqlite') return 'sqlite'
  if (provider === 'custom') return state.customConfig?.engine ?? 'postgresql'
  return 'postgresql'
}

function isSupported(provider: DatabaseProvider) {
  return DATABASE_PROVIDERS.includes(provider)
}

function getState(): DatabaseState {
  if (!globalForDatabase.databaseState) {
    const customConfig = readStoredCustomConfig()
    globalForDatabase.databaseState = {
      activeProvider: getDefaultProvider(customConfig),
      customConfig,
      clients: {},
    }
  }
  return globalForDatabase.databaseState
}

export function getDatabaseProviderStatus(): ProviderStatus[] {
  const state = getState()
  return DATABASE_PROVIDERS.map((provider) => ({
    provider,
    configured: Boolean(getProviderUrl(provider, state)),
    supported: isSupported(provider),
  }))
}

export function getActiveDatabaseProvider() {
  return getState().activeProvider
}

// Never exposes the raw connection string (it may contain a password) outside this module.
export function getActiveCustomConfigSummary(): Omit<CustomDatabaseConfig, 'url'> | null {
  const config = getState().customConfig
  if (!config) return null
  const { url: _url, ...safe } = config
  return safe
}

export function setActiveDatabaseProvider(provider: DatabaseProvider) {
  const state = getState()
  if (!DATABASE_PROVIDERS.includes(provider)) {
    throw new Error('Unknown database provider')
  }
  if (provider === 'custom' && !state.customConfig) {
    throw new Error('No custom database configuration is saved yet')
  }
  if (!getProviderUrl(provider, state)) {
    throw new Error(`${provider} database URL is not configured`)
  }

  state.activeProvider = provider
  return provider
}

export function saveAndActivateCustomDatabase(engine: CustomDatabaseEngine, url: string, label: string): CustomDatabaseConfig {
  const config: CustomDatabaseConfig = { engine, url, label, updatedAt: new Date().toISOString() }
  writeStoredCustomConfig(config)

  const state = getState()
  const staleClient = state.clients.custom
  state.customConfig = config
  state.activeProvider = 'custom'
  delete state.clients.custom

  if (staleClient) {
    staleClient.$disconnect().catch(() => {})
  }

  return config
}

export function clearCustomDatabase() {
  clearStoredCustomConfig()
  const state = getState()
  const staleClient = state.clients.custom
  state.customConfig = null
  delete state.clients.custom
  if (state.activeProvider === 'custom') {
    state.activeProvider = getDefaultProvider(null)
  }
  if (staleClient) {
    staleClient.$disconnect().catch(() => {})
  }
}

export function getDatabaseClient() {
  const state = getState()
  const provider = state.activeProvider
  const url = getProviderUrl(provider, state) || process.env.DATABASE_URL

  if (!url) {
    throw new Error(`No database URL configured for ${provider}`)
  }

  if (!state.clients[provider]) {
    const engine = providerEngine(provider, state)
    if (engine === 'sqlite') {
      state.clients[provider] = new SqlitePrismaClient({
        datasources: { db: { url } },
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
      })
    } else {
      state.clients[provider] = new PrismaClient({
        datasources: { db: { url } },
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
      })
    }
  }

  return state.clients[provider]!
}
