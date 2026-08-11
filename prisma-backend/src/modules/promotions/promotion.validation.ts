import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const promotionIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listPromotionsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  enabled: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING", "BUY_X_GET_Y"]).optional(),
  sort: z.enum(["created_at", "updated_at", "name", "starts_at"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createPromotionSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(100).optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING", "BUY_X_GET_Y"]),
  value: z.number().nonnegative(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  perCustomerLimit: z.number().int().positive().optional().nullable(),
  minSubtotal: z.number().nonnegative().optional().nullable(),
  stackable: z.boolean().optional(),
  enabled: z.boolean().optional(),
  rules: z.unknown().optional().nullable(),
});

export const updatePromotionSchema = createPromotionSchema.partial();

export type ListPromotionsQuery = z.infer<typeof listPromotionsQuerySchema>;
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
