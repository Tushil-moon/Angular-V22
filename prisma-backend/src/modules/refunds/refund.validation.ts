import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

const refundStatusSchema = z.enum(["REQUESTED", "APPROVED", "PROCESSING", "COMPLETED", "REJECTED"]);

export const refundIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listRefundsQuerySchema = paginationQuerySchema.extend({
  status: refundStatusSchema.optional(),
  orderId: z.string().uuid().optional(),
  search: z.string().optional(),
  sort: z.enum(["created_at", "updated_at", "amount"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createRefundSchema = z.object({
  orderId: z.string().uuid(),
  paymentId: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  reason: z.string().max(500).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
        amount: z.number().positive(),
        restock: z.boolean().optional(),
      }),
    )
    .optional(),
});

export const updateRefundSchema = z.object({
  status: refundStatusSchema,
  note: z.string().max(2000).optional().nullable(),
});

export type ListRefundsQuery = z.infer<typeof listRefundsQuerySchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type UpdateRefundInput = z.infer<typeof updateRefundSchema>;
