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
| `DATABASE_URL` | Yes | Pooled connection (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Yes | Direct connection for migrations at build |
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

- **Migrations** run during `prisma migrate deploy` in the Vercel build (`prisma-backend` `vercel-build` script)
- **Seed** is not run on Vercel. Run locally against production DB when needed:

```bash
cd prisma-backend
# Set DATABASE_URL / DIRECT_URL to production
npm run seed
```

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
| `DATABASE_UNAVAILABLE` | Check `DATABASE_URL`, allow Vercel IPs on Supabase |
| Build fails on migrate | Ensure `DIRECT_URL` is set and reachable from Vercel build |
| 404 on client routes | `vercel.json` SPA rewrite to `/index.html` |
| CORS errors | Set `CORS_ORIGIN` to your frontend URL (split deploy) |
