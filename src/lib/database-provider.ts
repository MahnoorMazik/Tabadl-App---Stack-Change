import { PrismaClient } from '@prisma/client'
import { PrismaClient as SqlitePrismaClient } from '../../.generated/sqlite'

export const DATABASE_PROVIDERS = ['neon', 'supabase', 'sqlite'] as const
export type DatabaseProvider = (typeof DATABASE_PROVIDERS)[number]

type ProviderStatus = {
  provider: DatabaseProvider
  configured: boolean
  supported: boolean
}

type DatabaseState = {
  activeProvider: DatabaseProvider
  clients: Partial<Record<DatabaseProvider, PrismaClient | SqlitePrismaClient>>
}

const globalForDatabase = globalThis as typeof globalThis & {
  databaseState?: DatabaseState
}

function getDefaultProvider(): DatabaseProvider {
  const configured = process.env.DATABASE_PROVIDER?.toLowerCase()
  if (configured && DATABASE_PROVIDERS.includes(configured as DatabaseProvider)) {
    return configured as DatabaseProvider
  }

  if (process.env.SUPABASE_DATABASE_URL) return 'supabase'
  if (process.env.DATABASE_URL?.includes('supabase')) return 'supabase'
  return 'neon'
}

function getProviderUrl(provider: DatabaseProvider): string | undefined {
  if (provider === 'neon') {
    return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_NEON
  }
  if (provider === 'supabase') {
    return process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL_SUPABASE ||
      (process.env.DATABASE_URL?.includes('supabase') ? process.env.DATABASE_URL : undefined)
  }
  if (provider === 'sqlite') {
    return process.env.SQLITE_DATABASE_URL || process.env.DATABASE_URL_SQLITE
  }
  return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL_NEON ||
    (process.env.DATABASE_URL?.includes('neon') ? process.env.DATABASE_URL : undefined)
}

function isSupported(provider: DatabaseProvider) {
  return provider === 'sqlite' || provider === 'neon' || provider === 'supabase'
}

function getState(): DatabaseState {
  if (!globalForDatabase.databaseState) {
    globalForDatabase.databaseState = {
      activeProvider: getDefaultProvider(),
      clients: {},
    }
  }
  return globalForDatabase.databaseState
}

export function getDatabaseProviderStatus(): ProviderStatus[] {
  return DATABASE_PROVIDERS.map((provider) => ({
    provider,
    configured: Boolean(getProviderUrl(provider)),
    supported: isSupported(provider),
  }))
}

export function getActiveDatabaseProvider() {
  return getState().activeProvider
}

export function setActiveDatabaseProvider(provider: DatabaseProvider) {
  if (!DATABASE_PROVIDERS.includes(provider)) {
    throw new Error('Unknown database provider')
  }
  if (!getProviderUrl(provider)) {
    throw new Error(`${provider} database URL is not configured`)
  }

  getState().activeProvider = provider
  return provider
}

export function getDatabaseClient() {
  const state = getState()
  const provider = state.activeProvider
  const url = getProviderUrl(provider) || process.env.DATABASE_URL

  if (!url) {
    throw new Error(`No database URL configured for ${provider}`)
  }

  if (!state.clients[provider]) {
    if (provider === 'sqlite') {
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
