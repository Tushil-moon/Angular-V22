import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateForecastInput, ListForecastsQuery, UpdateForecastInput } from "./forecast.validation";

export const forecastService = {
  async listForecasts(query: ListForecastsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = {
      organizationId,
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.forecastPeriod.findMany({ where, orderBy: { periodStart: "desc" }, skip, take: query.pageSize }),
      prisma.forecastPeriod.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getForecastById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.forecastPeriod.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "Forecast period not found", "FORECAST_NOT_FOUND");
    return item;
  },

  async createForecast(input: CreateForecastInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    return prisma.forecastPeriod.create({ data: { ...input, organizationId } });
  },

  async updateForecast(id: string, input: UpdateForecastInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.forecastPeriod.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Forecast period not found", "FORECAST_NOT_FOUND");
    return prisma.forecastPeriod.update({ where: { id }, data: input });
  },

  async deleteForecast(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.forecastPeriod.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Forecast period not found", "FORECAST_NOT_FOUND");
    await prisma.forecastPeriod.delete({ where: { id } });
  },
};
