# Angular V22 Full Stack — E-Commerce Admin

Monorepo for a production-oriented **e-commerce admin panel**:

```text
angular-v22/      → Angular 22 admin UI
prisma-backend/   → Express + Prisma + PostgreSQL API
docs/             → Architecture, database, API, lifecycles
```

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL (local Docker or managed)
- Redis (optional for local; required for workers/queues)

## Quick start

### Backend

```bash
cd prisma-backend
cp .env.example .env
# Set DATABASE_URL, DIRECT_URL, JWT secrets, ADMIN_PASSWORD
npm install
npx prisma migrate deploy
npm run seed
npm run dev
# optional worker:
npm run worker
```

API: `http://localhost:3000` — docs at `/docs`

### Frontend

```bash
cd angular-v22
npm install
npm start
```

App: `http://localhost:4200` (proxies `/api` → backend)

### Docker (API + Postgres + Redis + MinIO + worker)

```bash
cd prisma-backend
docker compose up --build
```

## Implemented domains (API)

- Auth, users, sessions, roles, permissions, audit logs
- Catalog: products (+ variants), categories, brands
- Inventory + warehouses (adjustments, low/out of stock)
- Customers + orders (create/confirm/cancel/ship/complete)
- Settings (store)
- Analytics dashboard aggregates

Frontend: auth flows, admin shell, settings, products list/create/edit, dashboard KPIs, coming-soon placeholders for remaining nav items.

## Conventions

- Backend: modular Express services, Zod validation, snake_case HTTP payloads
- Frontend: signals, `rxResource`, Observables (no `async/await` in app code), OnPush
- Money: `Decimal(15,4)`; order line snapshots are immutable
- Multi-store ready via `storeId`

See [`docs/architecture.md`](./docs/architecture.md) and [`docs/database.md`](./docs/database.md).

## Environment

Never commit `.env`. Use `prisma-backend/.env.example`.
