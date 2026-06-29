import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateQuoteInput, ListQuotesQuery, UpdateQuoteInput } from "./quote.validation";

const quoteInclude = { lineItems: true } as const;

export const quoteService = {
  async listQuotes(query: ListQuotesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const search = query.search?.trim() ?? "";
    const where = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.quote.findMany({ where, include: quoteInclude, orderBy: { updatedAt: "desc" }, skip, take: query.pageSize }),
      prisma.quote.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getQuoteById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const quote = await prisma.quote.findFirst({ where: { id, organizationId }, include: quoteInclude });
    if (!quote) throw new AppError(404, "Quote not found", "QUOTE_NOT_FOUND");
    return quote;
  },

  async createQuote(input: CreateQuoteInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const { lineItems, ...data } = input;
    return prisma.quote.create({
      data: {
        ...data,
        organizationId,
        ...(lineItems?.length
          ? { lineItems: { create: lineItems } }
          : {}),
      },
      include: quoteInclude,
    });
  },

  async updateQuote(id: string, input: UpdateQuoteInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.quote.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Quote not found", "QUOTE_NOT_FOUND");
    const { lineItems, ...data } = input;
    if (lineItems !== undefined) {
      await prisma.quoteLineItem.deleteMany({ where: { quoteId: id } });
    }
    return prisma.quote.update({
      where: { id },
      data: {
        ...data,
        ...(lineItems !== undefined ? { lineItems: { create: lineItems } } : {}),
      },
      include: quoteInclude,
    });
  },

  async deleteQuote(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.quote.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Quote not found", "QUOTE_NOT_FOUND");
    await prisma.quote.delete({ where: { id } });
  },
};
