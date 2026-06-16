import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { dealSelect, mapDeal } from "../../shared/utils/crm-mapper";
import type { CreateDealInput, ListDealsQuery, UpdateDealInput } from "./deal.validation";

const openStages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"] as const;

export const dealService = {
  async listDeals(query: ListDealsQuery) {
    const search = query.search?.trim() ?? "";
    const where = {
      deletedAt: null,
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
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
    };

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

  async getPipelineSummary() {
    const groups = await prisma.deal.groupBy({
      by: ["stage"],
      where: { deletedAt: null, stage: { in: [...openStages] } },
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

  async getDealById(id: string) {
    const deal = await prisma.deal.findFirst({
      where: { id, deletedAt: null },
      select: dealSelect,
    });

    if (!deal) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");

    return mapDeal(deal);
  },

  async createDeal(input: CreateDealInput, actorId: string) {
    if (input.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, deletedAt: null },
      });
      if (!contact) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    }

    const deal = await prisma.deal.create({
      data: {
        title: input.title.trim(),
        value: input.value,
        currency: input.currency ?? "USD",
        stage: input.stage ?? "LEAD",
        contactId: input.contactId,
        ownerId: input.ownerId ?? actorId,
        expectedCloseDate: input.expectedCloseDate,
        description: input.description?.trim() || undefined,
      },
      select: dealSelect,
    });

    return mapDeal(deal);
  },

  async updateDeal(id: string, input: UpdateDealInput) {
    const existing = await prisma.deal.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");

    if (input.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, deletedAt: null },
      });
      if (!contact) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    }

    const deal = await prisma.deal.update({
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
      select: dealSelect,
    });

    return mapDeal(deal);
  },

  async deleteDeal(id: string) {
    const existing = await prisma.deal.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");

    await prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
