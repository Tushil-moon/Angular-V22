# API Design

Base path: **`/api/v1`**

## Response envelope

Success:

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100, "total_pages": 5, "has_more": true }
}
```

Error:

```json
{
  "success": false,
  "message": "Product not found",
  "code": "PRODUCT_NOT_FOUND",
  "details": {}
}
```

- HTTP `data` / `details` keys: **snake_case**
- Internal TypeScript: **camelCase**
- Never expose raw Prisma errors

## Pagination / filters

Query params (lists):

```text
?page=1&page_size=20&search=&sort=created_at&order=desc&status=&from=&to=
```

Cap `page_size` at 100. Prefer cursor pagination for very large order streams later.

## Namespaces

```text
/api/v1/health
/api/v1/auth
/api/v1/users
/api/v1/roles
/api/v1/permissions
/api/v1/sessions
/api/v1/products
/api/v1/categories
/api/v1/brands
/api/v1/collections
/api/v1/inventory
/api/v1/warehouses
/api/v1/suppliers
/api/v1/purchase-orders
/api/v1/orders
/api/v1/customers
/api/v1/payments
/api/v1/shipping
/api/v1/promotions
/api/v1/coupons
/api/v1/reviews
/api/v1/wishlist
/api/v1/cms
/api/v1/media
/api/v1/analytics
/api/v1/reports
/api/v1/notifications
/api/v1/settings
/api/v1/audit-logs
```

## Auth (existing + extended)

```text
POST   /auth/login
POST   /auth/logout
POST   /auth/logout-all
POST   /auth/refresh
POST   /auth/register
POST   /auth/password/forgot
POST   /auth/password/reset
POST   /auth/password/change
POST   /auth/email/verify
POST   /auth/email/request-verification
POST   /auth/2fa/enable
POST   /auth/2fa/verify
POST   /auth/2fa/disable
GET    /auth/me
GET    /auth/security-policy
GET    /auth/security-status
```

## Idempotency

Mutating financial / inventory endpoints accept:

```text
Idempotency-Key: <uuid>
```

Results are stored and replayed for duplicate keys.

## Versioning

Breaking changes → `/api/v2`. Never silently change response shapes.
