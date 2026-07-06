import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";
import { REPORT_CHART_TYPES, REPORT_ENTITY_TYPES } from "./report.utils";

export const reportConfigSchema = z.object({
  groupBy: z.string().trim().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const reportWidgetSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["kpi", "chart", "table"]).optional(),
  title: z.string().trim().max(200).optional(),
  reportId: z.string().uuid().optional(),
  grid: z.record(z.string(), z.unknown()).optional(),
});

export const createReportSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  entityType: z.enum(REPORT_ENTITY_TYPES),
  chartType: z.enum(REPORT_CHART_TYPES).optional(),
  isShared: z.boolean().optional(),
  config: reportConfigSchema.optional(),
});

export const updateReportSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  entityType: z.enum(REPORT_ENTITY_TYPES).optional(),
  chartType: z.enum(REPORT_CHART_TYPES).optional(),
  isShared: z.boolean().optional(),
  config: reportConfigSchema.optional(),
});

export const reportIdParamSchema = z.object({ id: z.string().uuid() });

export const listReportsQuerySchema = paginationQuerySchema.extend({
  entityType: z.enum(REPORT_ENTITY_TYPES).optional(),
  search: z.string().optional(),
});

export const createDashboardLayoutSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  isDefault: z.boolean().optional(),
  isShared: z.boolean().optional(),
  widgets: z.array(reportWidgetSchema).optional(),
});

export const updateDashboardLayoutSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  isDefault: z.boolean().optional(),
  isShared: z.boolean().optional(),
  widgets: z.array(reportWidgetSchema).optional(),
});

export const dashboardLayoutIdParamSchema = z.object({ id: z.string().uuid() });

export const listDashboardLayoutsQuerySchema = paginationQuerySchema;

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
export type CreateDashboardLayoutInput = z.infer<typeof createDashboardLayoutSchema>;
export type UpdateDashboardLayoutInput = z.infer<typeof updateDashboardLayoutSchema>;
export type ListDashboardLayoutsQuery = z.infer<typeof listDashboardLayoutsQuerySchema>;
