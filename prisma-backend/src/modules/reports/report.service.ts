import type { Prisma } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error";
import {
  mapDashboardLayout,
  mapReport,
  mapReportRun,
} from "../../shared/utils/analytics-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { executeReportQuery } from "./report-query.service";
import { reportRepository } from "./report.repository";
import {
  buildLayoutListWhere,
  buildReportListWhere,
  normalizeLayoutWidgets,
  normalizeReportConfig,
  normalizeReportDefinition,
  rowsToCsv,
} from "./report.utils";
import type {
  CreateDashboardLayoutInput,
  CreateReportInput,
  ListDashboardLayoutsQuery,
  ListReportsQuery,
  UpdateDashboardLayoutInput,
  UpdateReportInput,
} from "./report.validation";

export const reportService = {
  async listReports(query: ListReportsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildReportListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      reportRepository.findManyReports(where, skip, query.pageSize),
      reportRepository.countReports(where),
    ]);
    return { data: data.map(mapReport), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getReportById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await reportRepository.findReportById({ id, organizationId });
    if (!item) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");
    return mapReport(item);
  },

  async createReport(input: CreateReportInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const userId = input.userId ?? auth.userId;
    if (!userId) throw new AppError(400, "User context required", "USER_REQUIRED");

    const item = await reportRepository.createReport({
      organization: { connect: { id: organizationId } },
      user: { connect: { id: userId } },
      name: input.name,
      description: input.description,
      entityType: input.entityType,
      chartType: input.chartType ?? "TABLE",
      isShared: input.isShared ?? false,
      config: normalizeReportDefinition(input.config ?? {}) as Prisma.InputJsonValue,
    });
    return mapReport(item);
  },

  async updateReport(id: string, input: UpdateReportInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await reportRepository.findReportById({ id, organizationId });
    if (!existing) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");

    const item = await reportRepository.updateReport(id, {
      name: input.name,
      description: input.description === null ? null : input.description,
      entityType: input.entityType,
      chartType: input.chartType,
      isShared: input.isShared,
      config: input.config ? (normalizeReportDefinition(input.config) as Prisma.InputJsonValue) : undefined,
    });
    return mapReport(item);
  },

  async deleteReport(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await reportRepository.findReportById({ id, organizationId });
    if (!existing) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");
    await reportRepository.deleteReport(id);
  },

  async runReport(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const report = await reportRepository.findReportById({ id, organizationId });
    if (!report) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");

    const run = await reportRepository.createRun({
      organization: { connect: { id: organizationId } },
      report: { connect: { id: report.id } },
      status: "PENDING",
      startedAt: new Date(),
    });

    try {
      const config = normalizeReportConfig(report.entityType, report.config);
      const result = await executeReportQuery(config, auth);
      const completed = await reportRepository.updateRun(run.id, {
        status: "COMPLETED",
        rowCount: result.rows.length,
        result: result as Prisma.InputJsonValue,
        completedAt: new Date(),
      });
      await reportRepository.updateReport(report.id, { lastRunAt: new Date() });
      return { run: mapReportRun(completed), result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Report execution failed";
      await reportRepository.updateRun(run.id, {
        status: "FAILED",
        errorMessage: message,
        completedAt: new Date(),
      });
      throw new AppError(400, message, "REPORT_RUN_FAILED");
    }
  },

  async exportReportCsv(id: string, auth: AuthContext) {
    const { result } = await this.runReport(id, auth);
    return rowsToCsv(result.columns, result.rows);
  },

  async listReportRuns(id: string, query: ListReportsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const report = await reportRepository.findReportById({ id, organizationId });
    if (!report) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");

    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      reportRepository.listRuns(id, skip, query.pageSize),
      reportRepository.countRuns(id),
    ]);
    return { data: data.map(mapReportRun), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getAnalyticsOverview(auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const [reportCount, layoutCount, reports] = await Promise.all([
      reportRepository.countReports({ organizationId }),
      reportRepository.countLayouts({ organizationId }),
      reportRepository.findManyReports({ organizationId }, 0, 5),
    ]);

    const runs = await Promise.all(
      reports.map(async (report) => {
        const latest = await reportRepository.listRuns(report.id, 0, 1);
        return latest[0] ? mapReportRun(latest[0]) : null;
      }),
    );

    return {
      reportCount,
      layoutCount,
      sharedReports: reports.filter((report) => report.isShared).length,
      recentRuns: runs.filter(Boolean),
    };
  },

  async listDashboardLayouts(query: ListDashboardLayoutsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildLayoutListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      reportRepository.findManyLayouts(where, skip, query.pageSize),
      reportRepository.countLayouts(where),
    ]);
    return { data: data.map(mapDashboardLayout), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getDashboardLayoutById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await reportRepository.findLayoutById({ id, organizationId });
    if (!item) throw new AppError(404, "Dashboard layout not found", "DASHBOARD_LAYOUT_NOT_FOUND");
    return mapDashboardLayout(item);
  },

  async createDashboardLayout(input: CreateDashboardLayoutInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const userId = input.userId ?? auth.userId;
    if (!userId) throw new AppError(400, "User context required", "USER_REQUIRED");

    const item = await reportRepository.createLayout({
      organization: { connect: { id: organizationId } },
      user: { connect: { id: userId } },
      name: input.name,
      description: input.description,
      isDefault: input.isDefault ?? false,
      isShared: input.isShared ?? false,
      widgets: normalizeLayoutWidgets(input.widgets ?? []) as Prisma.InputJsonValue,
    });
    return mapDashboardLayout(item);
  },

  async updateDashboardLayout(id: string, input: UpdateDashboardLayoutInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await reportRepository.findLayoutById({ id, organizationId });
    if (!existing) throw new AppError(404, "Dashboard layout not found", "DASHBOARD_LAYOUT_NOT_FOUND");

    const item = await reportRepository.updateLayout(id, {
      name: input.name,
      description: input.description === null ? null : input.description,
      isDefault: input.isDefault,
      isShared: input.isShared,
      widgets: input.widgets ? (normalizeLayoutWidgets(input.widgets) as Prisma.InputJsonValue) : undefined,
    });
    return mapDashboardLayout(item);
  },

  async deleteDashboardLayout(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await reportRepository.findLayoutById({ id, organizationId });
    if (!existing) throw new AppError(404, "Dashboard layout not found", "DASHBOARD_LAYOUT_NOT_FOUND");
    await reportRepository.deleteLayout(id);
  },
};
