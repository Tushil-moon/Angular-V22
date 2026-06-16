# Enterprise Auth API

Production-shaped authentication and authorization backend using Node.js, Express, PostgreSQL, Prisma ORM, and TypeScript.

## Structure

- `prisma/`: Prisma schema and SQL migrations.
- `src/config/`: environment parsing, logger, Prisma client.
- `src/middlewares/`: authentication, RBAC authorization, rate limiting, validation, error handling.
- `src/modules/auth/`: registration, login, OTP, email verification, password reset, token rotation, logout.
- `src/modules/sessions/`: device/session listing and revocation.
- `src/modules/roles/`: Admin-only RBAC role management.
- `src/modules/users/`: current-user profile APIs.
- `src/docs/`: Swagger/OpenAPI definition.
- `src/tests/`: Jest and Supertest test setup.

## Supabase URLs

Use the Transaction Pooler URL for runtime queries:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

Use the Direct DB URL or Session Pooler URL for Prisma CLI/migrations:

```env
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

## Local Commands

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Swagger runs at `http://localhost:3000/docs`.

## Security Notes

- Passwords are hashed with Argon2id.
- Refresh tokens are random opaque tokens stored only as SHA-256 hashes.
- Refresh token rotation revokes the previous token on every refresh.
- Access tokens are short-lived JWTs.
- Account lockout is enforced after repeated failed password login attempts.
- OTP and reset tokens are hashed in storage and expire quickly.
- Auth routes use stricter rate limits.
- Helmet, CORS controls, centralized error handling, and audit logging are enabled.

## Social Login Readiness

The `Account` model links external providers such as Google and GitHub to one internal user. Add provider adapters under `src/modules/auth/providers/` and create or link `Account` records using `(provider, providerAccountId)`.

## Deployment Recommendations

- Store secrets in a managed secret store, never in source control.
- Use HTTPS only and set secure cookies if you move refresh tokens to cookies.
- Run `npm run prisma:deploy` during deployment.
- Use Supabase pooler for runtime traffic and direct/session connection for migrations.
- Send audit logs to centralized logging/SIEM in production.
- Add email/SMS providers behind interfaces before enabling real verification delivery.
- Monitor failed login rates, lockouts, token reuse, and refresh anomalies.
- Keep JWT secrets rotated with a planned key versioning strategy.
