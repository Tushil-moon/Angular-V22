/**
 * Normalize DATABASE_URL for serverless runtimes (Vercel + Supabase).
 *
 * Supabase pooler modes:
 * - Transaction (port 6543) — required for serverless; multiplexes connections
 * - Session   (port 5432 on *.pooler.supabase.com) — max ~15 clients; do NOT use on Vercel
 */
export const normalizePooledDatabaseUrl = (rawUrl: string, serverless: boolean): string => {
  if (!serverless) return rawUrl;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const isSupabasePooler = url.hostname.includes("pooler.supabase.com");

  // Session pooler (5432) exhausts Supavisor pool_size on Vercel — use transaction pooler.
  if (isSupabasePooler && (url.port === "5432" || url.port === "")) {
    url.port = "6543";
  }

  if (isSupabasePooler || url.searchParams.get("pgbouncer") === "true") {
    url.searchParams.set("pgbouncer", "true");
  }

  // One connection per serverless instance.
  url.searchParams.set("connection_limit", "1");

  return url.toString();
};

export const isSupabaseSessionPoolerUrl = (rawUrl: string): boolean => {
  try {
    const url = new URL(rawUrl);
    return url.hostname.includes("pooler.supabase.com") && (url.port === "5432" || url.port === "");
  } catch {
    return false;
  }
};
