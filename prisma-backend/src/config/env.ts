import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_URL: z.url().optional(),
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
  FRONTEND_URL: z.url().default("http://localhost:4200"),
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
  REDIS_URL: z.url().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  /** local = disk, s3 = object storage, auto = s3 when fully configured else local */
  STORAGE_DRIVER: z.enum(["local", "s3", "auto"]).default("local"),
  UPLOAD_DIR: z.string().default("uploads"),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  /** Public origin for uploaded assets (no /api path). Defaults from API_BASE_URL. */
  PUBLIC_BASE_URL: z.url().optional(),
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

function resolveNodeEnv(): "development" | "production" | "test" | undefined {
  if (process.env.NODE_ENV === "development" && isVercel) {
    return "production";
  }
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV as "development" | "production" | "test";
  }
  return isVercel ? "production" : undefined;
}

function resolvePublicBaseUrl(config: {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
  API_BASE_URL?: string;
  PUBLIC_BASE_URL?: string;
}): string {
  if (config.PUBLIC_BASE_URL) {
    return config.PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  // Local dev must serve uploads from this machine even if API_BASE_URL points at production.
  if (!isServerless && config.NODE_ENV === "development") {
    return `http://localhost:${config.PORT}`;
  }

  const apiBase = config.API_BASE_URL?.replace(/\/$/, "") ?? `http://localhost:${config.PORT}`;
  return apiBase.replace(/\/api\/v\d+$/, "");
}

const parsedEnv = envSchema.parse({
  ...process.env,
  NODE_ENV: resolveNodeEnv(),
  API_BASE_URL:
    process.env.API_BASE_URL ||
    vercelOrigin ||
    "http://localhost:3000",
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ||
    [vercelOrigin, "http://localhost:4200", "http://127.0.0.1:4200"].filter(Boolean).join(","),
});

export const env = {
  ...parsedEnv,
  publicBaseUrl: resolvePublicBaseUrl(parsedEnv),
  uploadDirAbsolute: path.isAbsolute(parsedEnv.UPLOAD_DIR)
    ? parsedEnv.UPLOAD_DIR
    : path.resolve(process.cwd(), parsedEnv.UPLOAD_DIR),
};
export const isProduction = env.NODE_ENV === "production";
/** Runtime DB: pooled URL on Vercel/Lambda and in production. */
export const usePooledDatabase = isProduction || isServerless;
