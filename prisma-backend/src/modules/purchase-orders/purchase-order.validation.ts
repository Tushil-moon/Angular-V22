import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

const purchaseOrderStatusSchema = z.enum([
  "DRAFT",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
]);

export const purchaseOrderIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listPurchaseOrdersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: purchaseOrderStatusSchema.optional(),
  supplierId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  sort: z.enum(["created_at", "updated_at", "po_number", "ordered_at"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createPurchaseOrderSchema = z.object({
  warehouseId: z.string().uuid(),
  supplierId: z.string().uuid(),
  poNumber: z.string().min(1).max(100),
  status: purchaseOrderStatusSchema.optional(),
  currencyCode: z.string().length(3).optional(),
  note: z.string().max(2000).optional().nullable(),
  orderedAt: z.coerce.date().optional().nullable(),
  expectedAt: z.coerce.date().optional().nullable(),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial().extend({
  receivedAt: z.coerce.date().optional().nullable(),
});

export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
