# Architecture

Production-grade e-commerce admin platform evolved in place from `angular-v22/` + `prisma-backend/`.

## Goals

- Correctness → Security → Scalability → Maintainability → Performance → UX
- Modular monolith that can later extract services without rewriting business logic
- Multi-store ready from day one (`storeId` on tenant-scoped entities)
- Backend is source of truth for prices, tax, inventory, payments, and totals

## System context

```text
Angular 22 Admin (angular-v22)
        | HTTPS REST /api/v1
        v
Express 5 API (prisma-backend)
        |
        +-- Auth / Users / Roles
        +-- Catalog / Inventory / Orders / ...
        |
        +-- PostgreSQL (Prisma)
        +-- Redis (cache, rate limit, BullMQ)
        +-- Object storage (S3 / R2 / MinIO)
        +-- Worker process (BullMQ queues)
```

## Backend layers

```text
routes → rateLimit → validate → authenticate → authorize → controller → service → repository? → Prisma → PostgreSQL
```

Module layout:

```text
src/modules/<domain>/
  <domain>.routes.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repository.ts   # when query complexity warrants it
  <domain>.validation.ts
  <domain>.mapper.ts
```

Business logic lives in **services** only. Controllers stay thin.

## Frontend layers

```text
src/app/
  core/          # guards, interceptors, http, error handling
  shared/        # UI components, layouts, utils
  features/      # lazy-loaded domain modules
  services/      # shared singletons (auth, toast, theme)
```

Feature layout:

```text
features/<domain>/
  pages/
  components/
  services/      # typed Observable API clients
  models/
```

Conventions: standalone components, `inject()`, signals, `rxResource`, OnPush, no `async/await` in app code.

## Module boundaries

| Domain | Owns | Depends on |
|--------|------|------------|
| Auth/RBAC | Users, sessions, roles, permissions | — |
| Store/Settings | Store, tax, currencies | Auth |
| Catalog | Products, variants, categories, brands, media | Store, Media |
| Inventory | Warehouses, stock, POs | Catalog, Store |
| Customers | Customer CRM | Store |
| Sales | Cart, orders, fulfillments | Catalog, Inventory, Customers, Promotions, Tax, Shipping |
| Payments | Providers, transactions, refunds | Sales |
| Shipping | Zones, methods, rates, shipments | Sales |
| Marketing | Coupons, promotions, gift cards | Catalog, Customers |
| CMS | Pages, banners, menus | Media |
| Analytics/Reports | Aggregates, async report jobs | Sales, Catalog (read) |
| Notifications | In-app + email templates | Auth, Sales events |

## Background jobs

Queues: `email`, `notifications`, `reports`, `image-processing`, `analytics`, `inventory`, `webhooks`, `order-processing`, `abandoned-cart`.

Handlers must be idempotent with retry + dead-letter support.

## Multi-store readiness

- Single seeded store initially
- All catalog/sales/inventory entities carry `storeId`
- Future: `StoreUser` assignments without rewriting domain services

## Extraction path

Keep domain modules isolated (no cross-module Prisma leaks). Shared DTOs live under `src/shared/types/ecommerce/`. Later extract modules to microservices by replacing repository implementations.
