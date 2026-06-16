# Node.js + Prisma Backend — Production Standards

You are a senior backend engineer building a **production-grade** Express + TypeScript + PostgreSQL + Prisma API. This repo is **prisma-backend**; the Angular frontend is in `../angular-v22`.

Apply these rules to every change: security, consistency, observability, and maintainability are non-negotiable.

---

## 1. Architecture & folder structure

```
src/
  app.ts              # Express app wiring (middleware stack)
  server.ts           # Bootstrap, DB check, graceful shutdown
  routes.ts           # Mount module routers under /api/v1
  config/             # env (Zod), logger (Pino), prisma, cors
  middlewares/        # cross-cutting: auth, RBAC, validate, rate-limit, errors
  modules/<feature>/  # feature slices
    *.routes.ts       # HTTP map + middleware chain
    *.controller.ts   # thin handlers
    *.service.ts      # business logic + Prisma
    *.validation.ts   # Zod schemas
  shared/             # errors, utils, constants, types
  docs/               # OpenAPI / Swagger
  tests/              # Jest + Supertest
prisma/
  schema.prisma
  migrations/
```

**Layer flow (never skip layers):**

```
HTTP → routes → [rateLimit] → validate → authenticate → authorize → controller → service → Prisma
```

| Layer | Responsibility |
|-------|----------------|
| **routes** | Path, method, middleware order only |
| **controller** | Parse req context, call service, map to HTTP response |
| **service** | Business rules, transactions, token/crypto, audit logs |
| **validation** | Zod schemas; no business logic |

---

## 2. Environment & configuration

- Parse **all** env vars once at startup with **Zod** in `config/env.ts` — fail fast on boot if invalid
- Never read `process.env` directly outside `config/env.ts`
- Document every new variable in `.env.example`; **never commit `.env`**
- Use `isProduction` to hide internal error details from clients
- Secrets (JWT keys) must be ≥ 32 chars; store in a secret manager in production

```typescript
// ✅ Boot-time validation
export const env = envSchema.parse(process.env);

// ❌ Scattered env access in services
const ttl = process.env.ACCESS_TOKEN_TTL;
```

---

## 3. API design & HTTP conventions

- Base path: **`/api/v1`**
- Use nouns for resources, HTTP verbs for actions
- Consistent JSON envelope via `sendSuccess` / `sendCreated`:

```json
{ "success": true, "message": "OK", "data": { ... } }
{ "success": false, "message": "...", "code": "ERROR_CODE", "details": ... }
```

- Use correct status codes: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `429`, `503`, `500`
- Paginated lists: accept `page` + `limit` (or cursor), cap `limit` (e.g. max 100), return `{ items, total, page, limit }`
- Version breaking changes via `/api/v2`, not silent breakage
- Document new endpoints in Swagger (`src/docs/swagger.ts`)

---

## 4. Controllers

- Wrap **every** async handler with `asyncHandler`
- Controllers must stay thin — no Prisma calls, no complex branching
- Extract request meta consistently:

```typescript
const meta = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
  deviceId: req.get("x-device-id") ?? req.ip ?? "unknown-device",
});
```

- Use `sendSuccess(res, data, message?)` and `sendCreated(res, data, message?)`
- Never call `res.json()` with ad-hoc shapes

---

## 5. Validation (Zod)

- Define schemas in `*.validation.ts` per module
- Apply at route level with `validate({ body, params, query })`
- Reject unknown input; coerce types explicitly (`z.coerce.number()`)
- Share reusable field schemas (email, password, uuid, pagination)
- Validation errors are handled globally (`VALIDATION_ERROR` + `issues`)

---

## 6. Error handling

- Throw `AppError(statusCode, message, code?, details?)` for expected failures
- Let `errorHandler` middleware map errors to JSON — never duplicate try/catch in controllers
- **Production:** generic messages for 500/503; no stack traces or SQL in responses
- **Development:** include helpful `details` for DB/config issues
- Map Prisma/DB failures to `503 DATABASE_UNAVAILABLE`, not raw 500
- Use stable `code` strings (`UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`)

```typescript
// ✅ Service
throw new AppError(409, "Email already registered", "EMAIL_EXISTS");

// ❌ Controller
res.status(400).json({ error: "bad request" });
```

---

## 7. Security

### Transport & headers
- `helmet()` on all responses
- `trust proxy` when behind reverse proxy / load balancer
- CORS: explicit allowlist via `CORS_ORIGIN`; no `*` in production with credentials

### Authentication
- Access tokens: short-lived JWT in `Authorization: Bearer`
- Refresh tokens: opaque random tokens; store **SHA-256 hash only**
- Rotate refresh token on every refresh; revoke old token
- Validate session in DB on each authenticated request (`authenticate` middleware)
- Account lockout after `MAX_LOGIN_ATTEMPTS`; respect `lockedUntil`

### Passwords & tokens
- Hash passwords with **Argon2id** (configurable cost via env)
- Hash OTP, reset, and verification tokens before storage
- Set short TTLs for email/reset/OTP tokens

### Authorization
- RBAC via `authorize(...roleNames)` after `authenticate`
- Check permissions at service layer for sensitive operations, not only route level
- Default deny — explicit grant required

### Rate limiting
- `authLimiter` on login, register, OTP, password reset
- `generalLimiter` on all routes
- Return `429` with consistent error shape

### Input & output
- `express.json({ limit: "1mb" })` — reject oversized payloads
- Never log passwords, tokens, or full JWTs
- Sanitize user input; parameterized queries only (Prisma handles this)

---

## 8. Prisma & database

### Schema design
- UUID primary keys (`@default(uuid())`)
- `createdAt` / `updatedAt` on all mutable models
- Soft delete via `deletedAt` where applicable; filter `deletedAt: null` in queries
- Indexes on foreign keys, status fields, and common filter columns
- Use enums for fixed sets (status, audit actions)
- `@@map("snake_case_table")` for SQL-friendly names

### Client usage
- Single shared client from `config/prisma.ts`
- **Services only** — never import `prisma` in controllers or routes
- Use `select` / `include` intentionally; avoid `findMany` without `take`
- Use `$transaction` for multi-step writes (register + audit, reset password + revoke sessions)

```typescript
await prisma.$transaction([
  prisma.user.update({ ... }),
  prisma.session.updateMany({ ... }),
  prisma.auditLog.create({ ... }),
]);
```

### Migrations
- Never edit applied migration SQL manually in production
- Flow: change `schema.prisma` → `npm run prisma:migrate` (dev) → commit migration folder
- Production deploy: `npm run prisma:deploy` before starting app
- Runtime: `DATABASE_URL` (pooler); CLI/migrate: `DIRECT_URL`
- Regenerate client after schema changes: `npm run prisma:generate`
- Do not hand-edit `src/generated/prisma`

### Query performance
- Paginate all list endpoints
- Avoid N+1: use `include` or batch queries
- Add indexes before shipping heavy filters/sorts

---

## 9. Audit & observability

- Write **audit logs** for security-sensitive actions (login, logout, role changes, password reset)
- Include `userId`, `action` (enum), `ipAddress`, `userAgent`, metadata JSON when useful
- Structured logging with **Pino** via `pino-http` — log errors with `{ err, path }`
- Log levels: `info` for lifecycle, `warn` for auth failures, `error` for unhandled exceptions
- Health: verify DB on startup (`SELECT 1`); expose `/api/v1/health` if added
- Graceful shutdown: `SIGINT`/`SIGTERM` → close server → `prisma.$disconnect()`

---

## 10. Testing

- **Jest** + **Supertest** for HTTP integration tests
- Test happy path + auth failures + validation errors for each new endpoint
- Use a test database or isolated schema; never run tests against production DB
- Mock external services (email/SMS) — do not send real OTP in tests
- Meaningful tests only; no trivial "expect(true).toBe(true)"

---

## 11. Code quality (TypeScript)

- `"strict": true` in tsconfig
- No `any`; use `unknown` + narrowing
- Prefer `async/await` over raw Promise chains
- Export types alongside services when consumed by other modules
- CommonJS modules (`"type": "commonjs"`) — match existing project
- One feature per module folder; avoid god services

---

## 12. Deployment & operations

- Multi-stage **Docker** build: deps → build (prisma generate + tsc) → slim runtime
- Set `NODE_ENV=production` in runtime image
- Run migrations in CI/CD before or during deploy — not on every pod concurrently without locking
- Secrets from env / secret store, not baked into image
- Run behind HTTPS-terminating reverse proxy
- Monitor: error rate, latency p95, DB connection pool saturation

---

## 13. Adding a new feature (checklist)

1. Zod schemas in `*.validation.ts`
2. Service methods with business logic + Prisma
3. Thin controller handlers with `asyncHandler`
4. Routes with correct middleware chain (limiter → validate → auth → authorize)
5. Register router in `routes.ts`
6. Swagger docs updated
7. Audit log entries for sensitive mutations
8. Integration tests
9. `.env.example` updated if new config needed
10. Migration committed if schema changed

---

## 14. Do not

- Put Prisma or business logic in controllers/routes
- Return inconsistent JSON shapes
- Expose stack traces, SQL, or secrets in production responses
- Commit `.env`, credentials, or generated client artifacts incorrectly
- Skip validation on POST/PATCH/PUT/DELETE
- Use `$queryRaw` with string interpolation (SQL injection risk)
- Force-push git or push unless explicitly asked
- Add dependencies without justification
