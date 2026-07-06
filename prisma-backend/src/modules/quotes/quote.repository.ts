import type { Prisma, QuoteHistoryAction } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { quoteSelect } from "../../shared/utils/quote-mapper";

export const quoteRepository = {
  findMany(where: Prisma.QuoteWhereInput, skip: number, take: number) {
    return prisma.quote.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: quoteSelect,
    });
  },

  count(where: Prisma.QuoteWhereInput) {
    return prisma.quote.count({ where });
  },

  findById(where: Prisma.QuoteWhereInput) {
    return prisma.quote.findFirst({ where, select: quoteSelect });
  },

  countForNumber(organizationId: string) {
    return prisma.quote.count({ where: { organizationId } });
  },

  create(data: Prisma.QuoteCreateInput) {
    return prisma.quote.create({ data, select: quoteSelect });
  },

  update(id: string, data: Prisma.QuoteUpdateInput) {
    return prisma.quote.update({ where: { id }, data, select: quoteSelect });
  },

  delete(id: string) {
    return prisma.quote.delete({ where: { id } });
  },

  replaceLineItems(quoteId: string, items: Prisma.QuoteLineItemCreateManyInput[]) {
    return prisma.$transaction([
      prisma.quoteLineItem.deleteMany({ where: { quoteId } }),
      ...(items.length ? [prisma.quoteLineItem.createMany({ data: items })] : []),
    ]);
  },

  addHistory(data: {
    organizationId: string;
    quoteId: string;
    userId?: string;
    action: QuoteHistoryAction;
    details?: Prisma.InputJsonValue;
  }) {
    return prisma.quoteHistory.create({ data });
  },

  listHistory(quoteId: string) {
    return prisma.quoteHistory.findMany({
      where: { quoteId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true } } },
    });
  },

  listForExport(where: Prisma.QuoteWhereInput) {
    return prisma.quote.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        quoteNumber: true,
        title: true,
        status: true,
        total: true,
        currency: true,
        validUntil: true,
        deal: { select: { title: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    });
  },

  findProductsByIds(organizationId: string, productIds: string[]) {
    if (!productIds.length) return Promise.resolve([]);
    return prisma.product.findMany({
      where: { organizationId, id: { in: productIds }, status: "ACTIVE" },
    });
  },
};
