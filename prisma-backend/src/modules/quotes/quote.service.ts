import type { Prisma, QuoteHistoryAction, QuoteStatus } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error";
import { mapQuote, mapQuoteHistoryEntry } from "../../shared/utils/quote-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { quoteRepository } from "./quote.repository";
import {
  assertQuoteTransition,
  buildQuoteListWhere,
  calculateQuoteTotals,
  generateQuoteNumber,
  normalizeLineItems,
  quotesToCsv,
  type QuoteLineInput,
} from "./quote.utils";
import type {
  CreateQuoteInput,
  ExportQuotesQuery,
  ListQuotesQuery,
  UpdateQuoteInput,
} from "./quote.validation";

const recordHistory = async (
  auth: AuthContext,
  quoteId: string,
  action: QuoteHistoryAction,
  details?: Prisma.InputJsonValue,
) => {
  const organizationId = requireOrganizationContext(auth);
  await quoteRepository.addHistory({
    organizationId,
    quoteId,
    userId: auth.userId,
    action,
    details: details ?? {},
  });
};

const resolveLineItems = async (
  organizationId: string,
  lineItems: QuoteLineInput[] | undefined,
) => {
  if (!lineItems?.length) return [];

  const productIds = lineItems.map((item) => item.productId).filter(Boolean) as string[];
  const products = await quoteRepository.findProductsByIds(organizationId, productIds);
  const productMap = new Map(products.map((product) => [product.id, product]));

  const enriched = lineItems.map((item) => {
    if (!item.productId) return item;

    const product = productMap.get(item.productId);
    if (!product) {
      throw new AppError(400, "Product not found or inactive", "PRODUCT_NOT_FOUND");
    }

    return {
      ...item,
      sku: item.sku ?? product.sku,
      name: item.name ?? product.name,
      description: item.description || product.name,
      unitPrice: item.unitPrice ?? Number(product.unitPrice),
    };
  });

  return normalizeLineItems(enriched);
};

const buildQuotePayload = (
  lineItems: ReturnType<typeof normalizeLineItems>,
  discountPercent: number,
  taxPercent: number,
) => {
  const totals = calculateQuoteTotals(lineItems, discountPercent, taxPercent);
  return {
    subtotal: totals.subtotal,
    total: totals.total,
    discountPercent,
    taxPercent,
  };
};

const ensureEditable = (status: QuoteStatus) => {
  if (status !== "DRAFT") {
    throw new AppError(409, "Only draft quotes can be edited", "QUOTE_NOT_EDITABLE");
  }
};

export const quoteService = {
  async listQuotes(query: ListQuotesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildQuoteListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      quoteRepository.findMany(where, skip, query.pageSize),
      quoteRepository.count(where),
    ]);

    return { data: data.map(mapQuote), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getQuoteById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const quote = await quoteRepository.findById({ id, organizationId });
    if (!quote) throw new AppError(404, "Quote not found", "QUOTE_NOT_FOUND");
    return mapQuote(quote);
  },

  async createQuote(input: CreateQuoteInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const discountPercent = input.discountPercent ?? 0;
    const taxPercent = input.taxPercent ?? 0;
    const lineItems = await resolveLineItems(organizationId, input.lineItems);
    const totals = buildQuotePayload(lineItems, discountPercent, taxPercent);
    const sequence = (await quoteRepository.countForNumber(organizationId)) + 1;

    const quote = await quoteRepository.create({
      organization: { connect: { id: organizationId } },
      quoteNumber: generateQuoteNumber(sequence),
      title: input.title,
      status: input.status ?? "DRAFT",
      currency: input.currency ?? "USD",
      validUntil: input.validUntil,
      notes: input.notes,
      discountPercent,
      taxPercent,
      subtotal: totals.subtotal,
      total: totals.total,
      owner: input.ownerId ? { connect: { id: input.ownerId } } : auth.userId ? { connect: { id: auth.userId } } : undefined,
      deal: input.dealId ? { connect: { id: input.dealId } } : undefined,
      contact: input.contactId ? { connect: { id: input.contactId } } : undefined,
      company: input.companyId ? { connect: { id: input.companyId } } : undefined,
      lineItems: lineItems.length
        ? {
            create: lineItems.map(({ productId, ...item }) => ({
              ...item,
              ...(productId ? { product: { connect: { id: productId } } } : {}),
            })),
          }
        : undefined,
    });

    await recordHistory(auth, quote.id, "CREATED");
    if (lineItems.length) {
      await recordHistory(auth, quote.id, "LINE_ITEMS_CHANGED", { count: lineItems.length });
    }

    return mapQuote(quote);
  },

  async updateQuote(id: string, input: UpdateQuoteInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await quoteRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Quote not found", "QUOTE_NOT_FOUND");
    ensureEditable(existing.status);

    const discountPercent = input.discountPercent ?? Number(existing.discountPercent);
    const taxPercent = input.taxPercent ?? Number(existing.taxPercent);
    let lineItems = existing.lineItems.map((item) => ({
      productId: item.productId ?? undefined,
      sku: item.sku ?? undefined,
      name: item.name ?? undefined,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number(item.discountPercent),
      sortOrder: item.sortOrder,
    }));

    if (input.lineItems !== undefined) {
      const resolved = await resolveLineItems(organizationId, input.lineItems);
      lineItems = resolved.map((item) => ({
        productId: item.productId ?? undefined,
        sku: item.sku ?? undefined,
        name: item.name ?? undefined,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        sortOrder: item.sortOrder,
      }));
      await quoteRepository.replaceLineItems(
        id,
        resolved.map((item) => ({ quoteId: id, ...item })),
      );
      await recordHistory(auth, id, "LINE_ITEMS_CHANGED", { count: lineItems.length });
    }

    const totals = buildQuotePayload(normalizeLineItems(lineItems), discountPercent, taxPercent);

    await quoteRepository.update(id, {
      title: input.title,
      currency: input.currency,
      validUntil: input.validUntil === null ? null : input.validUntil,
      notes: input.notes === null ? null : input.notes,
      discountPercent,
      taxPercent,
      subtotal: totals.subtotal,
      total: totals.total,
      deal:
        input.dealId === null
          ? { disconnect: true }
          : input.dealId
            ? { connect: { id: input.dealId } }
            : undefined,
      contact:
        input.contactId === null
          ? { disconnect: true }
          : input.contactId
            ? { connect: { id: input.contactId } }
            : undefined,
      company:
        input.companyId === null
          ? { disconnect: true }
          : input.companyId
            ? { connect: { id: input.companyId } }
            : undefined,
      owner:
        input.ownerId === null
          ? { disconnect: true }
          : input.ownerId
            ? { connect: { id: input.ownerId } }
            : undefined,
    });

    await recordHistory(auth, id, "UPDATED");
    const refreshed = await quoteRepository.findById({ id, organizationId });
    return mapQuote(refreshed!);
  },

  async deleteQuote(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await quoteRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Quote not found", "QUOTE_NOT_FOUND");
    await quoteRepository.delete(id);
  },

  async sendQuote(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await quoteRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Quote not found", "QUOTE_NOT_FOUND");

    try {
      assertQuoteTransition(existing.status, "SENT");
    } catch {
      throw new AppError(409, "Only draft quotes can be sent", "QUOTE_INVALID_TRANSITION");
    }

    if (!existing.lineItems.length) {
      throw new AppError(400, "Add line items before sending the quote", "QUOTE_EMPTY");
    }

    await quoteRepository.update(id, { status: "SENT", sentAt: new Date() });
    await recordHistory(auth, id, "SENT");
    const quote = await quoteRepository.findById({ id, organizationId });
    return mapQuote(quote!);
  },

  async acceptQuote(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await quoteRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Quote not found", "QUOTE_NOT_FOUND");

    try {
      assertQuoteTransition(existing.status, "ACCEPTED");
    } catch {
      throw new AppError(409, "Only sent quotes can be accepted", "QUOTE_INVALID_TRANSITION");
    }

    await quoteRepository.update(id, { status: "ACCEPTED", acceptedAt: new Date() });
    await recordHistory(auth, id, "ACCEPTED");
    const quote = await quoteRepository.findById({ id, organizationId });
    return mapQuote(quote!);
  },

  async rejectQuote(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await quoteRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Quote not found", "QUOTE_NOT_FOUND");

    try {
      assertQuoteTransition(existing.status, "REJECTED");
    } catch {
      throw new AppError(409, "Only sent quotes can be rejected", "QUOTE_INVALID_TRANSITION");
    }

    await quoteRepository.update(id, { status: "REJECTED", rejectedAt: new Date() });
    await recordHistory(auth, id, "REJECTED");
    const quote = await quoteRepository.findById({ id, organizationId });
    return mapQuote(quote!);
  },

  async listHistory(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await quoteRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Quote not found", "QUOTE_NOT_FOUND");
    const history = await quoteRepository.listHistory(id);
    return history.map(mapQuoteHistoryEntry);
  },

  async exportQuotes(query: ExportQuotesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildQuoteListWhere({ ...query, page: 1, pageSize: 1 }, organizationId);
    const quotes = await quoteRepository.listForExport(where);
    return quotesToCsv(quotes);
  },
};
