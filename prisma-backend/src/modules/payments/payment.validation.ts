import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const paymentIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listPaymentsQuerySchema = paginationQuerySchema.extend({
  status: z
    .enum([
      "PENDING",
      "AUTHORIZED",
      "CAPTURED",
      "FAILED",
      "CANCELLED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
    ])
    .optional(),
  orderId: z.string().uuid().optional(),
  sort: z.enum(["created_at", "updated_at", "amount"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
