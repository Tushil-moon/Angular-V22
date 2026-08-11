import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

const refundStatusSchema = z.enum(["REQUESTED", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED"]);

export const refundIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listRefundsQuerySchema = paginationQuerySchema.extend({
  status: refundStatusSchema.optional(),
  orderId: z.string().uuid().optional(),
  sort: z.enum(["created_at", "updated_at", "amount"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const updateRefundSchema = z.object({
  status: refundStatusSchema,
  note: z.string().max(2000).optional().nullable(),
});

export type ListRefundsQuery = z.infer<typeof listRefundsQuerySchema>;
export type UpdateRefundInput = z.infer<typeof updateRefundSchema>;
