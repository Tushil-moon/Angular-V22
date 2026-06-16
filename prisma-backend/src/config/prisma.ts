import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env, isProduction } from "./env";

const connectionString = isProduction ? env.DATABASE_URL : env.DIRECT_URL || env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({
  adapter,
  log: isProduction ? ["error"] : ["warn", "error"],
});
