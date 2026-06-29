import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
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
    const where = {
      organizationId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.report.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take: query.pageSize }),
      prisma.report.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getReportById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.report.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");
    return item;
  },

  async createReport(input: CreateReportInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const userId = input.userId ?? auth.userId;
    const { userId: _userId, config, ...rest } = input;
    return prisma.report.create({
      data: { ...rest, userId, organizationId, config: (config ?? {}) as object },
    });
  },

  async updateReport(id: string, input: UpdateReportInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.report.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");
    const { config, ...rest } = input;
    return prisma.report.update({
      where: { id },
      data: { ...rest, ...(config !== undefined ? { config: config as object } : {}) },
    });
  },

  async deleteReport(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.report.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");
    await prisma.report.delete({ where: { id } });
  },

  async listDashboardLayouts(query: ListDashboardLayoutsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = { organizationId };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.dashboardLayout.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take: query.pageSize }),
      prisma.dashboardLayout.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getDashboardLayoutById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.dashboardLayout.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "Dashboard layout not found", "DASHBOARD_LAYOUT_NOT_FOUND");
    return item;
  },

  async createDashboardLayout(input: CreateDashboardLayoutInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const userId = input.userId ?? auth.userId;
    const { userId: _userId, widgets, ...rest } = input;
    return prisma.dashboardLayout.create({
      data: { ...rest, userId, organizationId, widgets: (widgets ?? []) as object },
    });
  },

  async updateDashboardLayout(id: string, input: UpdateDashboardLayoutInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.dashboardLayout.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Dashboard layout not found", "DASHBOARD_LAYOUT_NOT_FOUND");
    const { widgets, ...rest } = input;
    return prisma.dashboardLayout.update({
      where: { id },
      data: { ...rest, ...(widgets !== undefined ? { widgets: widgets as object } : {}) },
    });
  },

  async deleteDashboardLayout(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.dashboardLayout.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Dashboard layout not found", "DASHBOARD_LAYOUT_NOT_FOUND");
    await prisma.dashboardLayout.delete({ where: { id } });
  },
};
