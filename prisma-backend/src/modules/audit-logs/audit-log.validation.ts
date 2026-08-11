import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  resource: z.string().optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
