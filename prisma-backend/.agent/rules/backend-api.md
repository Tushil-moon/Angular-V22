# Backend — API, Testing & Deployment

REST API, testing, and deployment standards for **prisma-backend**. Read together with `backend.md`.

## REST naming

| Method | Path | Action |
|--------|------|--------|
| GET | `/users` | List (paginated) |
| GET | `/users/:id` | Get one |
| POST | `/users` | Create |
| PATCH | `/users/:id` | Partial update |
| DELETE | `/users/:id` | Soft/hard delete |

- Nested resources sparingly: `/users/:id/sessions`
- Actions as subpaths when not CRUD: `POST /auth/logout`, `POST /password/forgot`

## Route template

```typescript
router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  validate({ params: idParamSchema, body: updateSchema }),
  controller.update,
);
```

## Swagger

- Update `src/docs/swagger.ts` for every public endpoint
- Document request body schema, response shape, and auth requirements
- Keep `/docs` in sync with actual routes

## Testing

```typescript
// Integration test pattern
describe("GET /api/v1/health", () => {
  it("returns 200", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

- Test 401 without token, 403 wrong role, 400 invalid body
- Use `NODE_ENV=test` and isolated DB config
- Run: `npm test`

## Docker & CI

- Multi-stage Dockerfile: build with `prisma generate` + `tsc`, runtime with `--omit=dev`
- CI pipeline: lint → test → build → migrate deploy → deploy image
- Health check endpoint for orchestrator (K8s/ECS)

## Logging standards

```typescript
logger.info({ userId, action: "login" }, "User logged in");
logger.error({ err: error, path: req.originalUrl }, "Unhandled request error");
```

- No `console.log` in production code — use Pino logger
- Include correlation id if added later (`x-request-id`)

## Dependency policy

- Prefer well-maintained packages with active security advisories monitoring
- Pin major versions; audit with `npm audit` in CI
- No unnecessary middleware — each layer adds latency and attack surface
