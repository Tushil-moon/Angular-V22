import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

const giftCardStatusSchema = z.enum(["ACTIVE", "INACTIVE", "EXPIRED", "DEPLETED"]);

export const giftCardIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listGiftCardsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: giftCardStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  sort: z.enum(["created_at", "updated_at", "code", "expires_at"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createGiftCardSchema = z.object({
  code: z.string().min(1).max(100),
  initialBalance: z.number().nonnegative(),
  balance: z.number().nonnegative().optional(),
  currencyCode: z.string().length(3),
  status: giftCardStatusSchema.optional(),
  expiresAt: z.coerce.date().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
});

export const updateGiftCardSchema = createGiftCardSchema.partial();

export type ListGiftCardsQuery = z.infer<typeof listGiftCardsQuerySchema>;
export type CreateGiftCardInput = z.infer<typeof createGiftCardSchema>;
export type UpdateGiftCardInput = z.infer<typeof updateGiftCardSchema>;
