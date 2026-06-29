import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateCampaignInput, ListCampaignsQuery, UpdateCampaignInput } from "./campaign.validation";

export const campaignService = {
  async listCampaigns(query: ListCampaignsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const search = query.search?.trim() ?? "";
    const where = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.campaign.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take: query.pageSize }),
      prisma.campaign.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getCampaignById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.campaign.findFirst({
      where: { id, organizationId },
      include: { members: true },
    });
    if (!item) throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");
    return item;
  },

  async createCampaign(input: CreateCampaignInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    return prisma.campaign.create({ data: { ...input, organizationId } });
  },

  async updateCampaign(id: string, input: UpdateCampaignInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.campaign.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");
    return prisma.campaign.update({ where: { id }, data: input });
  },

  async deleteCampaign(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.campaign.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Campaign not found", "CAMPAIGN_NOT_FOUND");
    await prisma.campaign.delete({ where: { id } });
  },
};
