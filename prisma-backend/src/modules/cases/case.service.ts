import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateCaseInput, ListCasesQuery, UpdateCaseInput } from "./case.validation";

const caseInclude = { comments: { orderBy: { createdAt: "asc" as const } } } as const;

export const caseService = {
  async listCases(query: ListCasesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const search = query.search?.trim() ?? "";
    const where = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(search ? { subject: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.case.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take: query.pageSize }),
      prisma.case.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getCaseById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.case.findFirst({ where: { id, organizationId }, include: caseInclude });
    if (!item) throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
    return item;
  },

  async createCase(input: CreateCaseInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    return prisma.case.create({ data: { ...input, organizationId } });
  },

  async updateCase(id: string, input: UpdateCaseInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.case.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
    return prisma.case.update({ where: { id }, data: input, include: caseInclude });
  },

  async deleteCase(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.case.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
    await prisma.case.delete({ where: { id } });
  },
};
