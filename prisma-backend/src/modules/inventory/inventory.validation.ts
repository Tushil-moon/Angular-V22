import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const inventoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listInventoryQuerySchema = paginationQuerySchema.extend({
  warehouseId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  search: z.string().optional(),
  sort: z.enum(["updated_at", "quantity_on_hand", "quantity_available"]).optional().default("updated_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const listMovementsQuerySchema = paginationQuerySchema.extend({
  warehouseId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  type: z
    .enum([
      "ADJUSTMENT",
      "RECEIPT",
      "TRANSFER_IN",
      "TRANSFER_OUT",
      "RESERVE",
      "RELEASE",
      "FULFILL",
      "RETURN",
      "DAMAGE",
    ])
    .optional(),
});

export const adjustInventorySchema = z.object({
  warehouseId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantityDelta: z.number().int().refine((v) => v !== 0, "quantityDelta must be non-zero"),
  note: z.string().max(1000).optional(),
});

export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
