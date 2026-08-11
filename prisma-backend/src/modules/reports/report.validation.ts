import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const reportIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listReportsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
  type: z.string().optional(),
  sort: z.enum(["created_at", "updated_at", "completed_at"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createReportSchema = z.object({
  type: z.string().min(1).max(100),
  params: z.unknown().optional().nullable(),
  resultUrl: z.string().url().optional().nullable(),
});

export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
