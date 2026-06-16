# Angular V22 Full Stack

Monorepo with Angular 22 frontend and Express + Prisma backend.

## Structure

```
angular-v22/      → Angular 22 dashboard (frontend)
prisma-backend/   → Express API + Prisma (backend)
```

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL (or Supabase) for the backend

## Backend setup

```bash
cd prisma-backend
cp .env.example .env
# Edit .env with your database URL and JWT secrets
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

API runs at `http://localhost:3000`.

## Frontend setup

```bash
cd angular-v22
npm install
npm start
```

App runs at `http://localhost:4200` and proxies `/api` to the backend.

## Scripts

| Location | Command | Description |
|----------|---------|-------------|
| `angular-v22` | `npm start` | Dev server |
| `angular-v22` | `npm run build` | Production build |
| `prisma-backend` | `npm run dev` | API dev server |
| `prisma-backend` | `npm test` | Run tests |

## Environment

Never commit `.env` files. Use `prisma-backend/.env.example` as a template.
