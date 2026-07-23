import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log queries in development for performance
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })

// Enable singleton pattern for all environments to prevent connection pool issues
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = db
}