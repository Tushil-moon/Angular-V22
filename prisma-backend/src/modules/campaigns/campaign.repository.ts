import type { CampaignHistoryAction, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { campaignSelect } from "../../shared/utils/marketing-mapper";

export const campaignRepository = {
  findMany(where: Prisma.CampaignWhereInput, skip: number, take: number) {
    return prisma.campaign.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: campaignSelect,
    });
  },

  count(where: Prisma.CampaignWhereInput) {
    return prisma.campaign.count({ where });
  },

  findById(where: Prisma.CampaignWhereInput) {
    return prisma.campaign.findFirst({ where, select: campaignSelect });
  },

  create(data: Prisma.CampaignCreateInput) {
    return prisma.campaign.create({ data, select: campaignSelect });
  },

  update(id: string, data: Prisma.CampaignUpdateInput) {
    return prisma.campaign.update({ where: { id }, data, select: campaignSelect });
  },

  delete(id: string) {
    return prisma.campaign.delete({ where: { id } });
  },

  addMembers(campaignId: string, contactIds: string[]) {
    return prisma.campaignMember.createMany({
      data: contactIds.map((contactId) => ({ campaignId, contactId })),
      skipDuplicates: true,
    });
  },

  removeMember(campaignId: string, contactId: string) {
    return prisma.campaignMember.deleteMany({ where: { campaignId, contactId } });
  },

  markMembersSent(campaignId: string) {
    return prisma.campaignMember.updateMany({
      where: { campaignId, status: "PENDING" },
      data: { status: "SENT" },
    });
  },

  addHistory(data: {
    organizationId: string;
    campaignId: string;
    userId?: string;
    action: CampaignHistoryAction;
    details?: Prisma.InputJsonValue;
  }) {
    return prisma.campaignHistory.create({ data });
  },

  listHistory(campaignId: string) {
    return prisma.campaignHistory.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true } } },
    });
  },
};
