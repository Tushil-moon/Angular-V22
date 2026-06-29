import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type {
  CreateAiFeatureFlagInput,
  CreateAiInsightInput,
  ListAiFeatureFlagsQuery,
  ListAiInsightsQuery,
  UpdateAiFeatureFlagInput,
} from "./ai.validation";

export const aiService = {
  async listFeatureFlags(query: ListAiFeatureFlagsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = { organizationId };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.aiFeatureFlag.findMany({ where, orderBy: { feature: "asc" }, skip, take: query.pageSize }),
      prisma.aiFeatureFlag.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getFeatureFlagById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.aiFeatureFlag.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "AI feature flag not found", "AI_FEATURE_FLAG_NOT_FOUND");
    return item;
  },

  async createFeatureFlag(input: CreateAiFeatureFlagInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    try {
      return await prisma.aiFeatureFlag.create({ data: { ...input, organizationId } });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        throw new AppError(409, "AI feature flag already exists", "AI_FEATURE_FLAG_EXISTS");
      }
      throw error;
    }
  },

  async updateFeatureFlag(id: string, input: UpdateAiFeatureFlagInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.aiFeatureFlag.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "AI feature flag not found", "AI_FEATURE_FLAG_NOT_FOUND");
    return prisma.aiFeatureFlag.update({ where: { id }, data: input });
  },

  async deleteFeatureFlag(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.aiFeatureFlag.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "AI feature flag not found", "AI_FEATURE_FLAG_NOT_FOUND");
    await prisma.aiFeatureFlag.delete({ where: { id } });
  },

  async listInsights(query: ListAiInsightsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = {
      organizationId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.aiInsight.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: query.pageSize }),
      prisma.aiInsight.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getInsightById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.aiInsight.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "AI insight not found", "AI_INSIGHT_NOT_FOUND");
    return item;
  },

  async createInsight(input: CreateAiInsightInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const { payload, ...rest } = input;
    return prisma.aiInsight.create({
      data: { ...rest, organizationId, payload: (payload ?? {}) as object },
    });
  },

  async deleteInsight(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.aiInsight.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "AI insight not found", "AI_INSIGHT_NOT_FOUND");
    await prisma.aiInsight.delete({ where: { id } });
  },
};
