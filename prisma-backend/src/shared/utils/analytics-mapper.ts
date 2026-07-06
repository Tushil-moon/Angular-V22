import type { Prisma } from "@prisma/client";

const userSelect = { id: true, email: true } as const;

export const reportSelect = {
  id: true,
  organizationId: true,
  userId: true,
  name: true,
  description: true,
  entityType: true,
  chartType: true,
  isShared: true,
  config: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: userSelect },
} satisfies Prisma.ReportSelect;

export const reportRunSelect = {
  id: true,
  organizationId: true,
  reportId: true,
  status: true,
  rowCount: true,
  result: true,
  errorMessage: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
} satisfies Prisma.ReportRunSelect;

export const dashboardLayoutSelect = {
  id: true,
  organizationId: true,
  userId: true,
  name: true,
  description: true,
  isDefault: true,
  isShared: true,
  widgets: true,
  createdAt: true,
  updatedAt: true,
  user: { select: userSelect },
} satisfies Prisma.DashboardLayoutSelect;

type ReportRow = Prisma.ReportGetPayload<{ select: typeof reportSelect }>;

export const mapReport = (report: ReportRow) => ({
  id: report.id,
  organizationId: report.organizationId,
  userId: report.userId,
  name: report.name,
  description: report.description,
  entityType: report.entityType,
  chartType: report.chartType,
  isShared: report.isShared,
  config: report.config,
  lastRunAt: report.lastRunAt,
  user: report.user ? { id: report.user.id, email: report.user.email } : null,
  createdAt: report.createdAt,
  updatedAt: report.updatedAt,
});

export const mapReportRun = (
  run: Prisma.ReportRunGetPayload<{ select: typeof reportRunSelect }>,
) => ({
  id: run.id,
  organizationId: run.organizationId,
  reportId: run.reportId,
  status: run.status,
  rowCount: run.rowCount,
  result: run.result,
  errorMessage: run.errorMessage,
  startedAt: run.startedAt,
  completedAt: run.completedAt,
  createdAt: run.createdAt,
});

export const mapDashboardLayout = (
  layout: Prisma.DashboardLayoutGetPayload<{ select: typeof dashboardLayoutSelect }>,
) => ({
  id: layout.id,
  organizationId: layout.organizationId,
  userId: layout.userId,
  name: layout.name,
  description: layout.description,
  isDefault: layout.isDefault,
  isShared: layout.isShared,
  widgets: layout.widgets,
  user: layout.user ? { id: layout.user.id, email: layout.user.email } : null,
  createdAt: layout.createdAt,
  updatedAt: layout.updatedAt,
});
