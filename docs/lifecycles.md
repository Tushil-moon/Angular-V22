# Domain Lifecycles

## Order status

```text
PENDING → CONFIRMED → PROCESSING → PACKED → SHIPPED → DELIVERED → COMPLETED
   |           |
   +→ CANCELLED ←+
COMPLETED → REFUNDED | PARTIALLY_REFUNDED
```

Rules:

- Backend recalculates totals (never trust frontend)
- `OrderItem` stores immutable product/SKU/price/tax snapshots
- Status changes write `OrderStatusHistory`
- Cancel/refund releases inventory reservations

## Inventory

```text
adjust / receive / transfer / reserve / release / fulfill
```

- Every change creates an immutable `InventoryMovement`
- Reservations hold stock for carts/orders
- Fulfillment converts reservation → deducted on-hand
- Concurrent updates use transactions + row locks (`SELECT FOR UPDATE`)

## Payment

```text
created → authorized → captured → settled
                 \→ failed
captured → refunded (partial|full)
```

- Provider abstraction: `createPayment`, `verifyPayment`, `capturePayment`, `refundPayment`, `handleWebhook`
- Never trust frontend payment status
- Webhooks: signature verify, idempotent, logged, retryable

## Refund

```text
requested → approved → processing → completed | rejected
```

- Partial refunds create `RefundItem` lines
- Inventory restock optional (configurable)
- Gift card / store credit refunds write ledger transactions
