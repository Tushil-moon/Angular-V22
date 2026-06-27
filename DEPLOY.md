# Deploying to Vercel

This repo deploys as **one Vercel project**: Angular static frontend + Express API serverless function on the same domain.

- **App**: `https://<your-project>.vercel.app`
- **API**: `https://<your-project>.vercel.app/api/v1`
- **Swagger**: `https://<your-project>.vercel.app/docs`

## Prerequisites

1. [Vercel account](https://vercel.com) linked to GitHub
2. Postgres database (e.g. Supabase) with connection strings
3. JWT secrets (32+ characters each)

## 1. Configure environment variables

In Vercel → **Project → Settings → Environment Variables**, add variables from [`.env.vercel.example`](.env.vercel.example):

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | **Transaction** pooler (port **6543**, `?pgbouncer=true`) |
| `DIRECT_URL` | Yes | Direct DB URL (used locally; not required to work from Vercel build) |
| `JWT_ACCESS_SECRET` | Yes | ≥ 32 chars |
| `JWT_REFRESH_SECRET` | Yes | ≥ 32 chars |
| `JWT_EMAIL_SECRET` | Yes | ≥ 32 chars |
| `JWT_PASSWORD_RESET_SECRET` | Yes | ≥ 32 chars |
| `NODE_ENV` | Yes | `production` |
| `CORS_ORIGIN` | Optional | Auto-set from `VERCEL_URL` if omitted |
| `API_BASE_URL` | Optional | Auto-set from `VERCEL_URL` if omitted |

For unified deploy, leave `API_BASE_URL` unset on the frontend build (defaults to `/api/v1`).

## 2. Deploy from GitHub (recommended)

1. Push this repo to GitHub
2. Vercel → **Add New Project** → import `Angular-V22`
3. **Root Directory**: repository root (not `angular-v22`)
4. Framework Preset: **Other**
5. Build / output settings are read from [`vercel.json`](vercel.json)
6. Add environment variables → **Deploy**

## 3. Deploy from CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local   # or add vars in dashboard
vercel --prod
```

## 4. Database migrations & seed

**Migrations are skipped during the Vercel build** — Supabase direct host (`db.*.supabase.co`) is not reachable from Vercel’s build network.

Run migrations from your machine before or after deploy:

```bash
cd prisma-backend
# Use production DIRECT_URL in .env (or Supabase Session pooler :5432 on pooler host)
npm run prisma:deploy
```

Optional: run migrate on Vercel by setting `RUN_MIGRATE_ON_VERCEL=1` and `MIGRATE_DATABASE_URL` to the **Session pooler** (`*.pooler.supabase.com:5432`).

**Seed** is not run on Vercel. Run locally against production when needed:

## Local development

```bash
# Terminal 1 — API
cd prisma-backend && npm run dev

# Terminal 2 — Angular (proxies /api → localhost:3000)
cd angular-v22 && npm start
```

## Split deployments (optional)

To host API and frontend on separate Vercel projects:

- **API**: Root Directory `prisma-backend`, use [`prisma-backend/vercel.json`](prisma-backend/vercel.json)
- **Web**: Root Directory `angular-v22`, set `API_BASE_URL=https://<api-project>.vercel.app` before build

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `DATABASE_UNAVAILABLE` | Use Transaction pooler (6543) for `DATABASE_URL` |
| `EMAXCONNSESSION` | Do not use Session pooler (5432) for runtime `DATABASE_URL` |
| Build fails on migrate / P1001 | Migrations skip on Vercel; run `npm run prisma:deploy` locally |
| 404 on client routes | `vercel.json` SPA rewrite to `/index.html` |
| CORS errors | Set `CORS_ORIGIN` to your frontend URL (split deploy) |
