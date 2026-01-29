import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create or reuse the Prisma client
if (!globalForPrisma.prisma) {
  const connectionString = `${process.env.DATABASE_URL}`
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase
  })
  const adapter = new PrismaPg(pool)

  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma;

