import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { companySelect } from "../../shared/utils/crm-mapper";

export type CompanyRecord = Prisma.CompanyGetPayload<{ select: typeof companySelect }>;

const duplicateSelect = {
  id: true,
  name: true,
  domain: true,
} as const satisfies Prisma.CompanySelect;

const treeSelect = {
  id: true,
  parentCompanyId: true,
  name: true,
  domain: true,
  industry: true,
  ownershipPercent: true,
  employeeCount: true,
} as const satisfies Prisma.CompanySelect;

export const companyRepository = {
  findMany(where: Prisma.CompanyWhereInput, skip: number, take: number) {
    return prisma.company.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: companySelect,
    });
  },

  count(where: Prisma.CompanyWhereInput) {
    return prisma.company.count({ where });
  },

  findById(where: Prisma.CompanyWhereInput) {
    return prisma.company.findFirst({
      where,
      select: companySelect,
    });
  },

  listHierarchy(organizationId: string) {
    return prisma.company.findMany({
      where: { organizationId, deletedAt: null },
      select: treeSelect,
      orderBy: { name: "asc" },
    });
  },

  listRelations(organizationId: string) {
    return prisma.company.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, parentCompanyId: true },
    });
  },

  findForDuplicateCheck(organizationId: string, excludeCompanyId?: string) {
    return prisma.company.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(excludeCompanyId ? { id: { not: excludeCompanyId } } : {}),
      },
      select: duplicateSelect,
    });
  },

  findByDomain(organizationId: string, domain: string) {
    return prisma.company.findFirst({
      where: { organizationId, deletedAt: null, domain },
      select: { id: true },
    });
  },

  create(data: Prisma.CompanyCreateInput) {
    return prisma.company.create({ data, select: companySelect });
  },

  update(id: string, data: Prisma.CompanyUpdateInput) {
    return prisma.company.update({ where: { id }, data, select: companySelect });
  },

  softDelete(id: string) {
    return prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  replaceLocations(
    companyId: string,
    locations: Array<{
      label?: string | null;
      line1: string;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
      isPrimary?: boolean;
      isHeadquarters?: boolean;
    }>,
  ) {
    return prisma.$transaction([
      prisma.companyLocation.deleteMany({ where: { companyId } }),
      ...(locations.length
        ? [
            prisma.companyLocation.createMany({
              data: locations.map((entry) => ({
                companyId,
                label: entry.label ?? undefined,
                line1: entry.line1,
                line2: entry.line2 ?? undefined,
                city: entry.city ?? undefined,
                state: entry.state ?? undefined,
                postalCode: entry.postalCode ?? undefined,
                country: entry.country ?? undefined,
                isPrimary: entry.isPrimary ?? false,
                isHeadquarters: entry.isHeadquarters ?? false,
              })),
            }),
          ]
        : []),
    ]);
  },

  listForExport(where: Prisma.CompanyWhereInput) {
    return prisma.company.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        name: true,
        domain: true,
        industry: true,
        size: true,
        website: true,
        employeeCount: true,
        annualRevenue: true,
        revenueCurrency: true,
        ownershipPercent: true,
        notes: true,
        parentCompany: { select: { domain: true } },
      },
    });
  },
};
