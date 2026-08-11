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
  FRONTEND_URL: z.string().url().default("http://localhost:4200"),
  EMAIL_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Ecommerce <noreply@example.com>"),
  PASSWORD_HISTORY_COUNT: z.coerce.number().int().positive().default(5),
  REMEMBER_ME_TTL_DAYS: z.coerce.number().int().positive().default(90),
  REDIS_URL: z.string().url().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
export const isServerless =
  process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const isVercel = isServerless;

export const env = envSchema.parse({
  ...process.env,
  NODE_ENV:
    process.env.NODE_ENV === "development" && isVercel
      ? "production"
      : process.env.NODE_ENV || (isVercel ? "production" : undefined),
  API_BASE_URL:
    process.env.API_BASE_URL ||
    vercelOrigin ||
    "http://localhost:3000",
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    [vercelOrigin, "http://localhost:4200", "http://127.0.0.1:4200"].filter(Boolean).join(","),
});
export const isProduction = env.NODE_ENV === "production";
/** Runtime DB: pooled URL on Vercel/Lambda and in production. */
export const usePooledDatabase = isProduction || isServerless;
