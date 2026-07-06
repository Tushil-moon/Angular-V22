import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { dashboardLayoutSelect, reportRunSelect, reportSelect } from "../../shared/utils/analytics-mapper";

export const reportRepository = {
  findManyReports(where: Prisma.ReportWhereInput, skip: number, take: number) {
    return prisma.report.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: reportSelect,
    });
  },

  countReports(where: Prisma.ReportWhereInput) {
    return prisma.report.count({ where });
  },

  findReportById(where: Prisma.ReportWhereInput) {
    return prisma.report.findFirst({ where, select: reportSelect });
  },

  createReport(data: Prisma.ReportCreateInput) {
    return prisma.report.create({ data, select: reportSelect });
  },

  updateReport(id: string, data: Prisma.ReportUpdateInput) {
    return prisma.report.update({ where: { id }, data, select: reportSelect });
  },

  deleteReport(id: string) {
    return prisma.report.delete({ where: { id } });
  },

  createRun(data: Prisma.ReportRunCreateInput) {
    return prisma.reportRun.create({ data, select: reportRunSelect });
  },

  updateRun(id: string, data: Prisma.ReportRunUpdateInput) {
    return prisma.reportRun.update({ where: { id }, data, select: reportRunSelect });
  },

  listRuns(reportId: string, skip: number, take: number) {
    return prisma.reportRun.findMany({
      where: { reportId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: reportRunSelect,
    });
  },

  countRuns(reportId: string) {
    return prisma.reportRun.count({ where: { reportId } });
  },

  findManyLayouts(where: Prisma.DashboardLayoutWhereInput, skip: number, take: number) {
    return prisma.dashboardLayout.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: dashboardLayoutSelect,
    });
  },

  countLayouts(where: Prisma.DashboardLayoutWhereInput) {
    return prisma.dashboardLayout.count({ where });
  },

  findLayoutById(where: Prisma.DashboardLayoutWhereInput) {
    return prisma.dashboardLayout.findFirst({ where, select: dashboardLayoutSelect });
  },

  createLayout(data: Prisma.DashboardLayoutCreateInput) {
    return prisma.dashboardLayout.create({ data, select: dashboardLayoutSelect });
  },

  updateLayout(id: string, data: Prisma.DashboardLayoutUpdateInput) {
    return prisma.dashboardLayout.update({ where: { id }, data, select: dashboardLayoutSelect });
  },

  deleteLayout(id: string) {
    return prisma.dashboardLayout.delete({ where: { id } });
  },
};
