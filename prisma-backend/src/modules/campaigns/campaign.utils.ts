import type { CampaignStatus, Prisma } from "@prisma/client";

import type { ListCampaignsQuery } from "./campaign.validation";

export const buildCampaignListWhere = (
  query: ListCampaignsQuery,
  organizationId: string,
): Prisma.CampaignWhereInput => {
  const filters: Prisma.CampaignWhereInput = { organizationId };

  if (query.status) filters.status = query.status;
  if (query.type) filters.type = query.type;

  const search = query.search?.trim();
  if (search) {
    filters.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  return filters;
};

export const assertCampaignTransition = (current: CampaignStatus, next: CampaignStatus) => {
  const allowed: Record<CampaignStatus, CampaignStatus[]> = {
    DRAFT: ["ACTIVE", "COMPLETED"],
    ACTIVE: ["COMPLETED", "DRAFT"],
    COMPLETED: ["DRAFT"],
  };

  if (!allowed[current].includes(next)) {
    throw new Error(`Cannot transition campaign from ${current} to ${next}`);
  }
};

export const calculateOpenRate = (sent: number, opened: number) =>
  sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0;

export const calculateClickRate = (sent: number, clicked: number) =>
  sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0;
