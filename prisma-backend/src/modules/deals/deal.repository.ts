import type { DealHistoryAction, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { dealSelect } from "../../shared/utils/crm-mapper";

export type DealRecord = Prisma.DealGetPayload<{ select: typeof dealSelect }>;

export const dealRepository = {
  findMany(where: Prisma.DealWhereInput, skip: number, take: number) {
    return prisma.deal.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      skip,
      take,
      select: dealSelect,
    });
  },

  count(where: Prisma.DealWhereInput) {
    return prisma.deal.count({ where });
  },

  findById(where: Prisma.DealWhereInput) {
    return prisma.deal.findFirst({ where, select: dealSelect });
  },

  create(data: Prisma.DealCreateInput) {
    return prisma.deal.create({ data, select: dealSelect });
  },

  update(id: string, data: Prisma.DealUpdateInput) {
    return prisma.deal.update({ where: { id }, data, select: dealSelect });
  },

  softDelete(id: string) {
    return prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  listBoard(where: Prisma.DealWhereInput) {
    return prisma.deal.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: dealSelect,
    });
  },

  addHistory(data: {
    organizationId: string;
    dealId: string;
    userId?: string;
    action: DealHistoryAction;
    details?: Prisma.InputJsonValue;
  }) {
    return prisma.dealHistory.create({ data });
  },

  listHistory(dealId: string) {
    return prisma.dealHistory.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  },

  listForExport(where: Prisma.DealWhereInput) {
    return prisma.deal.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        title: true,
        value: true,
        currency: true,
        stage: true,
        expectedCloseDate: true,
        description: true,
        competitor: true,
        contact: { select: { email: true, company: true } },
      },
    });
  },
};
