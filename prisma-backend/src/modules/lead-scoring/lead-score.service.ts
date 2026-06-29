import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateLeadScoreRuleInput, ListLeadScoreRulesQuery, UpdateLeadScoreRuleInput } from "./lead-score.validation";

export const leadScoreService = {
  async listRules(query: ListLeadScoreRulesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = {
      organizationId,
      ...(query.active !== undefined ? { active: query.active } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.leadScoreRule.findMany({ where, orderBy: { name: "asc" }, skip, take: query.pageSize }),
      prisma.leadScoreRule.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getRuleById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.leadScoreRule.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "Lead score rule not found", "LEAD_SCORE_RULE_NOT_FOUND");
    return item;
  },

  async createRule(input: CreateLeadScoreRuleInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    return prisma.leadScoreRule.create({ data: { ...input, organizationId } });
  },

  async updateRule(id: string, input: UpdateLeadScoreRuleInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.leadScoreRule.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Lead score rule not found", "LEAD_SCORE_RULE_NOT_FOUND");
    return prisma.leadScoreRule.update({ where: { id }, data: input });
  },

  async deleteRule(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.leadScoreRule.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Lead score rule not found", "LEAD_SCORE_RULE_NOT_FOUND");
    await prisma.leadScoreRule.delete({ where: { id } });
  },
};
