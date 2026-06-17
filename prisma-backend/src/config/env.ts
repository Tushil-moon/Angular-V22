import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  SHADOW_DATABASE_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EMAIL_SECRET: z.string().min(32),
  JWT_PASSWORD_RESET_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  EMAIL_TOKEN_TTL: z.string().default("30m"),
  PASSWORD_RESET_TOKEN_TTL: z.string().default("15m"),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_RESEND_SECONDS: z.coerce.number().int().positive().default(60),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(19456),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(2),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1),
  CORS_ORIGIN: z.string().default("http://localhost:4200"),
});

const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;

export const env = envSchema.parse({
  ...process.env,
  API_BASE_URL:
    process.env.API_BASE_URL ||
    vercelOrigin ||
    "http://localhost:3000",
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    [vercelOrigin, "http://localhost:4200", "http://127.0.0.1:4200"].filter(Boolean).join(","),
});
export const isProduction = env.NODE_ENV === "production";
