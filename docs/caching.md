# Caching Strategy

Redis is used for:

| Use case | Key pattern | TTL | Invalidation |
|----------|-------------|-----|--------------|
| Sessions / rate limit | `rl:{ip}:{route}` | window | natural expiry |
| Store settings | `store:{id}:settings` | 5m | on settings PATCH |
| Catalog category tree | `store:{id}:categories:tree` | 2m | on category mutate |
| Dashboard aggregates | `store:{id}:analytics:{range}` | 1–5m | time-based; optional bust on order |
| Idempotency | `idem:{key}` | 24h | natural expiry |
| Distributed locks | `lock:inventory:{id}` | short | release on unlock |
| BullMQ | managed by BullMQ | — | — |

## Rules

- Do **not** cache transactional stock balances as source of truth
- Do **not** cache JWT validation bypassing DB session checks
- Never cache passwords, refresh tokens, or payment secrets
- Prefer cache-aside; write-through only for settings

## Invalidation

On write paths that affect cached reads, delete matching keys in the same request after successful commit.
