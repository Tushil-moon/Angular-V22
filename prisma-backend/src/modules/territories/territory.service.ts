import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateTerritoryInput, ListTerritoriesQuery, UpdateTerritoryInput } from "./territory.validation";

export const territoryService = {
  async listTerritories(query: ListTerritoriesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const search = query.search?.trim() ?? "";
    const where = {
      organizationId,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.territory.findMany({ where, orderBy: { name: "asc" }, skip, take: query.pageSize }),
      prisma.territory.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getTerritoryById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.territory.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "Territory not found", "TERRITORY_NOT_FOUND");
    return item;
  },

  async createTerritory(input: CreateTerritoryInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const { rules, ...rest } = input;
    return prisma.territory.create({
      data: { ...rest, organizationId, rules: (rules ?? {}) as object },
    });
  },

  async updateTerritory(id: string, input: UpdateTerritoryInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.territory.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Territory not found", "TERRITORY_NOT_FOUND");
    const { rules, ...rest } = input;
    return prisma.territory.update({
      where: { id },
      data: { ...rest, ...(rules !== undefined ? { rules: rules as object } : {}) },
    });
  },

  async deleteTerritory(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.territory.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Territory not found", "TERRITORY_NOT_FOUND");
    await prisma.territory.delete({ where: { id } });
  },
};
