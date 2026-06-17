import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { companySelect, mapCompany } from "../../shared/utils/crm-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import {
  assertRecordOwnerAccess,
  buildOwnerScopedWhere,
} from "../../shared/utils/access-control";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import type { CreateCompanyInput, ListCompaniesQuery, UpdateCompanyInput } from "./company.validation";

export const companyService = {
  async listCompanies(query: ListCompaniesQuery, auth: AuthContext) {
    const search = query.search?.trim() ?? "";
    const where = buildOwnerScopedWhere(auth, {
      deletedAt: null,
      ...(query.industry ? { industry: query.industry } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { domain: { contains: search, mode: "insensitive" as const } },
              { industry: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    });

    const skip = (query.page - 1) * query.pageSize;

    const [companies, total] = await prisma.$transaction([
      prisma.company.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: query.pageSize,
        select: companySelect,
      }),
      prisma.company.count({ where }),
    ]);

    return {
      data: companies.map(mapCompany),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async getCompanyById(id: string, auth: AuthContext) {
    const company = await prisma.company.findFirst({
      where: buildOwnerScopedWhere(auth, { id, deletedAt: null }),
      select: companySelect,
    });

    if (!company) throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    return mapCompany(company);
  },

  async createCompany(input: CreateCompanyInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const company = await prisma.company.create({
      data: {
        organizationId,
        name: input.name.trim(),
        domain: input.domain?.trim() || undefined,
        industry: input.industry?.trim() || undefined,
        size: input.size?.trim() || undefined,
        website: input.website?.trim() || undefined,
        address: input.address?.trim() || undefined,
        ownerId: input.ownerId ?? auth.userId,
        notes: input.notes?.trim() || undefined,
      },
      select: companySelect,
    });

    return mapCompany(company);
  },

  async updateCompany(id: string, input: UpdateCompanyInput, auth: AuthContext) {
    const existing = await prisma.company.findFirst({
      where: buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    });
    if (!existing) throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    const company = await prisma.company.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        domain: input.domain?.trim(),
        industry: input.industry?.trim(),
        size: input.size?.trim(),
        website: input.website?.trim(),
        address: input.address?.trim(),
        ownerId: input.ownerId,
        notes: input.notes?.trim(),
      },
      select: companySelect,
    });

    return mapCompany(company);
  },

  async deleteCompany(id: string, auth: AuthContext) {
    const existing = await prisma.company.findFirst({
      where: buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    });
    if (!existing) throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    await prisma.company.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
