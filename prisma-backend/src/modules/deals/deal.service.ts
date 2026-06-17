import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { dealSelect, mapDeal } from "../../shared/utils/crm-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import {
  assertRecordOwnerAccess,
  buildOwnerScopedWhere,
} from "../../shared/utils/access-control";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { ensureTags, syncDealTags } from "../../shared/utils/tag-sync";
import type { CreateDealInput, ListDealsQuery, UpdateDealInput } from "./deal.validation";

const openStages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"] as const;

const resolveTagIds = async (auth: AuthContext, tagIds?: string[], tagNames?: string[]) => {
  const organizationId = requireOrganizationContext(auth);
  const ids = [...(tagIds ?? [])];
  if (tagNames?.length) ids.push(...(await ensureTags(organizationId, tagNames)));
  return [...new Set(ids)];
};

export const dealService = {
  async listDeals(query: ListDealsQuery, auth: AuthContext) {
    const search = query.search?.trim() ?? "";
    const where = buildOwnerScopedWhere(auth, {
      deletedAt: null,
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              {
                contact: {
                  OR: [
                    { firstName: { contains: search, mode: "insensitive" as const } },
                    { lastName: { contains: search, mode: "insensitive" as const } },
                    { company: { contains: search, mode: "insensitive" as const } },
                  ],
                },
              },
            ],
          }
        : {}),
    });

    const skip = (query.page - 1) * query.pageSize;

    const [deals, total] = await prisma.$transaction([
      prisma.deal.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: query.pageSize,
        select: dealSelect,
      }),
      prisma.deal.count({ where }),
    ]);

    return {
      data: deals.map(mapDeal),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async getPipelineSummary(auth: AuthContext) {
    const where = buildOwnerScopedWhere(auth, {
      deletedAt: null,
      stage: { in: [...openStages] },
    });

    const groups = await prisma.deal.groupBy({
      by: ["stage"],
      where,
      _count: { _all: true },
      _sum: { value: true },
    });

    return openStages.map((stage) => {
      const row = groups.find((g) => g.stage === stage);
      return {
        stage,
        count: row?._count._all ?? 0,
        value: Number(row?._sum.value ?? 0),
      };
    });
  },

  async getBoard(auth: AuthContext) {
    const where = buildOwnerScopedWhere(auth, {
      deletedAt: null,
      stage: { in: [...openStages] },
    });

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: dealSelect,
    });

    const mapped = deals.map(mapDeal);

    return openStages.map((stage) => ({
      stage,
      deals: mapped.filter((deal) => deal.stage === stage),
    }));
  },

  async getDealById(id: string, auth: AuthContext) {
    const deal = await prisma.deal.findFirst({
      where: buildOwnerScopedWhere(auth, { id, deletedAt: null }),
      select: dealSelect,
    });

    if (!deal) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");

    return mapDeal(deal);
  },

  async createDeal(input: CreateDealInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    if (input.contactId) {
      const contact = await prisma.contact.findFirst({
        where: buildOwnerScopedWhere(auth, { id: input.contactId, deletedAt: null }),
      });
      if (!contact) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    }

    const tagIds = await resolveTagIds(auth, input.tagIds, input.tagNames);

    const deal = await prisma.$transaction(async (tx) => {
      const created = await tx.deal.create({
        data: {
          organizationId,
          title: input.title.trim(),
          value: input.value,
          currency: input.currency ?? "USD",
          stage: input.stage ?? "LEAD",
          contactId: input.contactId,
          ownerId: input.ownerId ?? auth.userId,
          expectedCloseDate: input.expectedCloseDate,
          description: input.description?.trim() || undefined,
        },
        select: dealSelect,
      });

      if (tagIds.length) {
        await tx.dealTag.createMany({
          data: tagIds.map((tagId) => ({ dealId: created.id, tagId })),
          skipDuplicates: true,
        });
      }

      return tx.deal.findUniqueOrThrow({ where: { id: created.id }, select: dealSelect });
    });

    return mapDeal(deal);
  },

  async updateDeal(id: string, input: UpdateDealInput, auth: AuthContext) {
    const existing = await prisma.deal.findFirst({
      where: buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    });

    if (!existing) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    if (input.contactId) {
      const contact = await prisma.contact.findFirst({
        where: buildOwnerScopedWhere(auth, { id: input.contactId, deletedAt: null }),
      });
      if (!contact) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    }

    const tagIds =
      input.tagIds !== undefined || input.tagNames !== undefined
        ? await resolveTagIds(auth, input.tagIds, input.tagNames)
        : undefined;

    const deal = await prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id },
        data: {
          title: input.title?.trim(),
          value: input.value,
          currency: input.currency,
          stage: input.stage,
          contactId: input.contactId,
          ownerId: input.ownerId,
          expectedCloseDate: input.expectedCloseDate,
          description: input.description?.trim(),
        },
      });

      if (tagIds !== undefined) {
        await syncDealTags(id, tagIds);
      }

      return tx.deal.findUniqueOrThrow({ where: { id }, select: dealSelect });
    });

    return mapDeal(deal);
  },

  async deleteDeal(id: string, auth: AuthContext) {
    const existing = await prisma.deal.findFirst({
      where: buildOwnerScopedWhere(auth, { id, deletedAt: null }),
    });

    if (!existing) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");
    assertRecordOwnerAccess(auth, existing.ownerId);

    await prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
