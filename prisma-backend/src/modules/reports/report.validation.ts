import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createReportSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  entityType: z.string().trim().min(1).max(50),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const updateReportSchema = createReportSchema.partial();

export const reportIdParamSchema = z.object({ id: z.string().uuid() });

export const listReportsQuerySchema = paginationQuerySchema.extend({
  entityType: z.string().optional(),
});

export const createDashboardLayoutSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  widgets: z.array(z.record(z.string(), z.unknown())).optional(),
});

export const updateDashboardLayoutSchema = createDashboardLayoutSchema.partial();

export const dashboardLayoutIdParamSchema = z.object({ id: z.string().uuid() });

export const listDashboardLayoutsQuerySchema = paginationQuerySchema;

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
export type CreateDashboardLayoutInput = z.infer<typeof createDashboardLayoutSchema>;
export type UpdateDashboardLayoutInput = z.infer<typeof updateDashboardLayoutSchema>;
export type ListDashboardLayoutsQuery = z.infer<typeof listDashboardLayoutsQuerySchema>;
