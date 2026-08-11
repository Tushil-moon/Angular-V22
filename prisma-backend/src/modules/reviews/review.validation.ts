import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const reviewIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listReviewsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"]).optional(),
  productId: z.string().uuid().optional(),
  sort: z.enum(["created_at", "updated_at", "rating"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const updateReviewSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "FLAGGED"]).optional(),
  adminReply: z.string().max(5000).optional().nullable(),
});

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
