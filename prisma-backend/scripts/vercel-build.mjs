/**
 * Vercel build helper — generate client, optionally migrate, compile.
 *
 * Supabase direct host (db.*.supabase.co) is often unreachable from Vercel build
 * (IPv6 / network). Run migrations locally or set MIGRATE_DATABASE_URL to the
 * Session pooler (pooler host :5432) if you must migrate during CI.
 */
import { execSync } from "node:child_process";

const run = (command) => {
  execSync(command, { stdio: "inherit", env: process.env });
};

run("npx prisma generate");

const isVercel = process.env.VERCEL === "1";
const forceMigrate = process.env.RUN_MIGRATE_ON_VERCEL === "1";
const migrateUrl = process.env.MIGRATE_DATABASE_URL?.trim();

if (!isVercel || forceMigrate) {
  if (isVercel && !migrateUrl) {
    console.warn(
      "[vercel-build] RUN_MIGRATE_ON_VERCEL=1 but MIGRATE_DATABASE_URL is unset. " +
        "Set it to Supabase Session pooler (port 5432 on *.pooler.supabase.com).",
    );
  }
  run("npx prisma migrate deploy");
} else {
  console.log(
    "[vercel-build] Skipping prisma migrate deploy on Vercel. " +
      "Run `npm run prisma:deploy` locally against production before/after deploy.",
  );
}

run("npm run build");
