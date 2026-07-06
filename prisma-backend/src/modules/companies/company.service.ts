import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { mapCompany } from "../../shared/utils/crm-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import {
  assertRecordOwnerAccess,
  buildOwnerScopedWhere,
} from "../../shared/utils/access-control";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { companyRepository } from "./company.repository";
import {
  assertValidParentCompany,
  buildCompanyTree,
  collectCompanyDescendantIds,
  companiesToCsv,
  normalizeDomain,
  parseCsvCompanies,
  pickPrimaryLocationLine,
  scoreCompanyDuplicate,
} from "./company.utils";
import type {
  CheckCompanyDuplicatesInput,
  CreateCompanyInput,
  ImportCompaniesCsvInput,
  ImportCompaniesInput,
  ListCompaniesQuery,
  UpdateCompanyInput,
} from "./company.validation";

const buildListWhere = (query: ListCompaniesQuery, auth: AuthContext) => {
  const search = query.search?.trim() ?? "";
  return buildOwnerScopedWhere(auth, {
    deletedAt: null,
    ...(query.industry ? { industry: query.industry } : {}),
    ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    ...(query.parentCompanyId ? { parentCompanyId: query.parentCompanyId } : {}),
    ...(query.rootOnly ? { parentCompanyId: null } : {}),
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
};

const normalizeLocations = (input: CreateCompanyInput | UpdateCompanyInput) => {
  const locations =
    input.locations?.map((entry, index) => ({
      ...entry,
      isPrimary: entry.isPrimary ?? index === 0,
      isHeadquarters: entry.isHeadquarters ?? index === 0,
    })) ?? [];

  if (!locations.length && input.address?.trim()) {
    locations.push({
      line1: input.address.trim(),
      isPrimary: true,
      isHeadquarters: true,
    });
  }

  return locations;
};

const validateParent = async (
  organizationId: string,
  companyId: string | undefined,
  parentCompanyId: string | null | undefined,
) => {
  if (!parentCompanyId) return;

  const parent = await companyRepository.findById({
    id: parentCompanyId,
    organizationId,
    deletedAt: null,
  });
  if (!parent) throw new AppError(404, "Parent company not found", "PARENT_NOT_FOUND");

  if (companyId) {
    const relations = await companyRepository.listRelations(organizationId);
    const descendants = collectCompanyDescendantIds(relations, companyId);
    try {
      assertValidParentCompany(companyId, parentCompanyId, descendants);
    } catch (error) {
      throw new AppError(400, (error as Error).message, "INVALID_PARENT");
    }
  }
};

export const companyService = {
  async listCompanies(query: ListCompaniesQuery, auth: AuthContext) {
    const where = buildListWhere(query, auth);
    const skip = (query.page - 1) * query.pageSize;

    const [companies, total] = await Promise.all([
      companyRepository.findMany(where, skip, query.pageSize),
      companyRepository.count(where),
    ]);

    return {
      data: companies.map(mapCompany),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async getCompanyTree(auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const companies = await companyRepository.listHierarchy(organizationId);
    return buildCompanyTree(companies);
  },

  async getCompanyById(id: string, auth: AuthContext) {
    const company = await companyRepository.findById(
      buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    );
    if (!company) throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    return mapCompany(company);
  },

  async createCompany(input: CreateCompanyInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    await validateParent(organizationId, undefined, input.parentCompanyId ?? null);

    const locations = normalizeLocations(input);
    const domain = normalizeDomain(input.domain);

    const company = await companyRepository.create({
      organization: { connect: { id: organizationId } },
      name: input.name.trim(),
      domain,
      industry: input.industry?.trim() || undefined,
      size: input.size?.trim() || undefined,
      website: input.website?.trim() || undefined,
      address: pickPrimaryLocationLine(locations) ?? (input.address?.trim() || undefined),
      parentCompany: input.parentCompanyId
        ? { connect: { id: input.parentCompanyId } }
        : undefined,
      employeeCount: input.employeeCount,
      annualRevenue: input.annualRevenue,
      revenueCurrency: input.revenueCurrency ?? "USD",
      ownershipPercent: input.ownershipPercent ?? undefined,
      owner: { connect: { id: input.ownerId ?? auth.userId } },
      notes: input.notes?.trim() || undefined,
    });

    if (locations.length) {
      await companyRepository.replaceLocations(company.id, locations);
    }

    const refreshed = await companyRepository.findById({ id: company.id });
    return mapCompany(refreshed!);
  },

  async updateCompany(id: string, input: UpdateCompanyInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await companyRepository.findById(
      buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    );
    if (!existing) throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    if (input.parentCompanyId !== undefined) {
      await validateParent(organizationId, id, input.parentCompanyId);
    }

    const locations =
      input.locations !== undefined || input.address !== undefined
        ? normalizeLocations(input)
        : null;

    await companyRepository.update(id, {
      name: input.name?.trim(),
      domain: input.domain !== undefined ? normalizeDomain(input.domain) : undefined,
      industry: input.industry?.trim(),
      size: input.size?.trim(),
      website: input.website?.trim(),
      address:
        locations !== null
          ? (pickPrimaryLocationLine(locations) ?? input.address?.trim())
          : input.address?.trim(),
      parentCompany:
        input.parentCompanyId === null
          ? { disconnect: true }
          : input.parentCompanyId
            ? { connect: { id: input.parentCompanyId } }
            : undefined,
      employeeCount: input.employeeCount,
      annualRevenue: input.annualRevenue,
      revenueCurrency: input.revenueCurrency,
      ownershipPercent: input.ownershipPercent,
      owner: input.ownerId ? { connect: { id: input.ownerId } } : undefined,
      notes: input.notes?.trim(),
    });

    if (locations) {
      await companyRepository.replaceLocations(id, locations);
    }

    const refreshed = await companyRepository.findById({ id });
    return mapCompany(refreshed!);
  },

  async deleteCompany(id: string, auth: AuthContext) {
    const existing = await companyRepository.findById(
      buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    );
    if (!existing) throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);
    await companyRepository.softDelete(id);
  },

  async checkDuplicates(input: CheckCompanyDuplicatesInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const candidates = await companyRepository.findForDuplicateCheck(
      organizationId,
      input.excludeCompanyId,
    );

    const matches = candidates
      .map((candidate) =>
        scoreCompanyDuplicate(candidate, {
          name: input.name,
          domain: input.domain,
          excludeCompanyId: input.excludeCompanyId,
        }),
      )
      .filter((match): match is NonNullable<typeof match> => match !== null)
      .sort((left, right) => right.score - left.score);

    const companyIds = matches.map((match) => match.companyId);
    const companies = companyIds.length
      ? await companyRepository.findMany({ id: { in: companyIds } }, 0, companyIds.length)
      : [];
    const companyMap = new Map(companies.map((company) => [company.id, mapCompany(company)]));

    return matches.map((match) => ({
      ...match,
      company: companyMap.get(match.companyId) ?? null,
    }));
  },

  async importCompanies(input: ImportCompaniesInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const ownerId = auth.userId;
    const created = [];
    const skipped: Array<{ row: number; reason: string }> = [];
    const failed: Array<{ row: number; reason: string }> = [];

    for (let index = 0; index < input.rows.length; index += 1) {
      const row = input.rows[index];
      const domain = normalizeDomain(row.domain);

      if (input.skipDuplicates && (domain || row.name)) {
        const duplicates = await this.checkDuplicates({ name: row.name, domain }, auth);
        if (duplicates.length) {
          skipped.push({ row: index + 1, reason: "Duplicate company detected" });
          continue;
        }
      }

      try {
        let parentCompanyId: string | undefined;
        if (row.parentDomain) {
          const parent = await companyRepository.findByDomain(
            organizationId,
            normalizeDomain(row.parentDomain) ?? row.parentDomain,
          );
          parentCompanyId = parent?.id;
        }

        const company = await this.createCompany(
          {
            name: row.name,
            domain,
            industry: row.industry,
            size: row.size,
            website: row.website,
            employeeCount: row.employeeCount,
            annualRevenue: row.annualRevenue,
            revenueCurrency: row.revenueCurrency,
            ownershipPercent: row.ownershipPercent,
            parentCompanyId,
            notes: row.notes,
            ownerId,
          },
          auth,
        );
        created.push(company);
      } catch {
        failed.push({ row: index + 1, reason: "Could not create company" });
      }
    }

    return {
      createdCount: created.length,
      skippedCount: skipped.length,
      failedCount: failed.length,
      created,
      skipped,
      failed,
    };
  },

  async importCompaniesCsv(input: ImportCompaniesCsvInput, auth: AuthContext) {
    const rows = parseCsvCompanies(input.csv).filter((row) => row.name);
    if (!rows.length) {
      throw new AppError(400, "No valid company rows found in CSV", "INVALID_CSV");
    }

    return this.importCompanies(
      {
        rows: rows.map((row) => ({
          name: row.name,
          domain: row.domain,
          industry: row.industry,
          size: row.size,
          website: row.website,
          employeeCount: row.employeeCount,
          annualRevenue: row.annualRevenue,
          revenueCurrency: row.revenueCurrency,
          parentDomain: row.parentDomain,
          ownershipPercent: row.ownershipPercent,
          notes: row.notes,
        })),
        skipDuplicates: input.skipDuplicates,
      },
      auth,
    );
  },

  async exportCompanies(query: ListCompaniesQuery, auth: AuthContext) {
    const where = buildListWhere(query, auth);
    const companies = await companyRepository.listForExport(where);
    const csv = companiesToCsv(
      companies.map((company) => ({
        name: company.name,
        domain: company.domain ?? undefined,
        industry: company.industry ?? undefined,
        size: company.size ?? undefined,
        website: company.website ?? undefined,
        employeeCount: company.employeeCount ?? undefined,
        annualRevenue:
          company.annualRevenue !== null ? Number(company.annualRevenue) : undefined,
        revenueCurrency: company.revenueCurrency,
        parentDomain: company.parentCompany?.domain ?? undefined,
        ownershipPercent:
          company.ownershipPercent !== null ? Number(company.ownershipPercent) : undefined,
        notes: company.notes ?? undefined,
      })),
    );

    return { csv, count: companies.length };
  },
};
