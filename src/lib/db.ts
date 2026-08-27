import { getDatabaseClient } from '@/lib/database-provider'
import type { PrismaClient } from '@prisma/client'

export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getDatabaseClient()
    return Reflect.get(client, property, client)
  },
})