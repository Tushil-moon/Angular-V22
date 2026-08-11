# Deployment

## Local stack (docker-compose)

Services:

- `api` — Express API (port 3000)
- `worker` — BullMQ worker
- `postgres` — PostgreSQL 16
- `redis` — Redis 7
- `minio` — S3-compatible object storage (optional)

## Environment

See `prisma-backend/.env.example`. Required:

- `DATABASE_URL`, `DIRECT_URL`
- JWT secrets (≥ 32 chars)
- `REDIS_URL`
- Optional: S3/MinIO, Stripe/Razorpay, SMTP

Never commit `.env`.

## CI stages

1. Install (`npm ci`)
2. Lint / typecheck
3. Unit + integration tests
4. `prisma generate` + build
5. Migrate validate / deploy (staging)
6. Docker image build
7. Deploy + health check `GET /api/v1/health/ready`

## Health

```text
GET /api/v1/health        — basic
GET /api/v1/health/live   — process up
GET /api/v1/health/ready  — DB + Redis ready
```

## Migrations

Use `DIRECT_URL` for `prisma migrate deploy`. Never migrate through transaction pooler.
