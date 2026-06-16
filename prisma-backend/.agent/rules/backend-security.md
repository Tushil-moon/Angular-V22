# Backend — Security & Auth

Production security rules for **prisma-backend**. Read together with `backend.md`.

## Authentication flow

1. Login/register returns access JWT + opaque refresh token
2. Client sends `Authorization: Bearer <access>`
3. `authenticate` verifies JWT, loads session + user + roles from DB
4. Refresh endpoint validates refresh hash, rotates token, revokes previous

## Token rules

| Token | Storage | TTL |
|-------|---------|-----|
| Access JWT | Client memory / header | Short (`ACCESS_TOKEN_TTL`) |
| Refresh | Client secure storage | Days; hash-only in DB |
| Email verify | Hashed in DB | `EMAIL_TOKEN_TTL` |
| Password reset | Hashed in DB | `PASSWORD_RESET_TOKEN_TTL` |
| OTP | Hashed in DB | `OTP_TTL_MINUTES` |

- Never store raw refresh/reset/OTP tokens in the database
- Revoke all sessions on password reset when appropriate
- Increment `failedLoginAttempts`; lock account per `MAX_LOGIN_ATTEMPTS` / `LOCKOUT_MINUTES`

## RBAC

- Roles attached via `UserRole`; permissions via `RolePermission`
- Route level: `authorize("admin")` after `authenticate`
- Service level: re-check ownership/role for IDOR-sensitive operations (user can only edit self unless admin)

## Rate limits

Apply `authLimiter` to: register, login, OTP, email verify request, forgot/reset password.

## Audit actions

Log to `AuditLog` for: register, login success/fail, logout, refresh rotate, email verified, password changed/reset, role assign/remove, account locked.

Include `ipAddress`, `userAgent`, and `userId` when available.

## CORS & cookies

- `CORS_ORIGIN` comma-separated allowlist
- If using cookies later: `httpOnly`, `secure` in production, `sameSite: strict/lax`

## Production hardening

- Disable Swagger or protect `/docs` in production if public-facing
- Rotate JWT secrets on compromise (forces re-login)
- Use managed secrets (AWS SM, Vault, etc.) — not plain env files on disk in prod
