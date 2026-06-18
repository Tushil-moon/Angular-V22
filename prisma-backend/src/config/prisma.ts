import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { normalizePooledDatabaseUrl } from "./database-url";
import { env, isServerless, usePooledDatabase } from "./env";
import { logger } from "./logger";

const rawConnectionString = usePooledDatabase
  ? env.DATABASE_URL
  : env.DIRECT_URL || env.DATABASE_URL;

const connectionString = usePooledDatabase
  ? normalizePooledDatabaseUrl(rawConnectionString, isServerless)
  : rawConnectionString;

if (isServerless && connectionString !== rawConnectionString) {
  logger.warn(
    "DATABASE_URL normalized for serverless (transaction pooler port 6543). " +
      "Update Vercel env: use Supabase → Connect → Transaction pooler, not Session.",
  );
}

const createPool = () =>
  new pg.Pool({
    connectionString,
    max: isServerless ? 1 : 10,
    idleTimeoutMillis: isServerless ? 1_000 : 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: isServerless,
    ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  });

const createPrismaClient = () => {
  const pool = createPool();
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: usePooledDatabase ? ["error"] : ["warn", "error"],
  });
};

const globalForPrisma = globalThis as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (isServerless) {
  globalForPrisma.prisma = prisma;
}
