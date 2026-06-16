# Backend — Prisma & Database

Production database rules for **prisma-backend**. Read together with `backend.md`.

## Connection URLs

```env
# Runtime API queries (transaction pooler)
DATABASE_URL="postgresql://...pooler...:6543/postgres?pgbouncer=true"

# Migrations & Prisma CLI (direct or session)
DIRECT_URL="postgresql://...:5432/postgres"
```

- Never run `prisma migrate` against the transaction pooler URL
- Verify connection on startup (`$queryRaw\`SELECT 1\``)

## Schema conventions

```prisma
model Example {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  @@index([deletedAt])
  @@map("examples")
}
```

- Enums for status/type fields — avoid magic strings in app code
- Unique constraints on natural keys (`email`, `phone`)
- Cascade rules explicit on relations

## Query patterns

```typescript
// ✅ Paginated list
const [items, total] = await prisma.$transaction([
  prisma.user.findMany({ where, skip, take: limit, select: { id: true, email: true } }),
  prisma.user.count({ where }),
]);

// ✅ Atomic mutation + audit
await prisma.$transaction([
  prisma.user.update({ where: { id }, data }),
  prisma.auditLog.create({ data: { userId: id, action: "..." } }),
]);

// ❌ Unbounded query
await prisma.user.findMany();
```

## Migrations workflow

1. Edit `prisma/schema.prisma`
2. `npm run prisma:migrate` (creates SQL in `prisma/migrations/`)
3. `npm run prisma:generate`
4. Commit schema + migration folder together
5. Deploy: `npm run prisma:deploy` then start app

- Never delete migration history
- Use descriptive migration names
- Test rollback strategy for destructive changes

## Error mapping

- Unique violation (`P2002`) → `409 CONFLICT`
- Not found (`P2025`) → `404 NOT_FOUND`
- Connection errors → `503 DATABASE_UNAVAILABLE` (via error handler)

## Performance

- Index columns used in `where`, `orderBy`, and joins
- Avoid `include` depth > 2 unless necessary
- Use `select` to limit columns on large tables
- Consider read replicas for heavy read workloads (future)

## Seeds

- Seed script in `src/scripts/seed.ts` — idempotent where possible
- Never seed production with default passwords without forced change on first login
