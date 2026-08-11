import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const couponIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCouponsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
  promotionId: z.string().uuid().optional(),
  sort: z.enum(["created_at", "updated_at", "code"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createCouponSchema = z.object({
  code: z.string().min(1).max(100),
  promotionId: z.string().uuid().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
  usageLimit: z.number().int().positive().optional().nullable(),
  perCustomerLimit: z.number().int().positive().optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
});

export const updateCouponSchema = createCouponSchema.partial();

export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
