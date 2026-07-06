import type { Prisma, QuoteStatus } from "@prisma/client";

import type { ListQuotesQuery } from "./quote.validation";

export type QuoteLineInput = {
  productId?: string;
  sku?: string;
  name?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  sortOrder?: number;
};

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const calculateLineTotal = (
  quantity: number,
  unitPrice: number,
  discountPercent = 0,
) => {
  const gross = quantity * unitPrice;
  const discount = gross * (discountPercent / 100);
  return roundMoney(gross - discount);
};

export const calculateQuoteTotals = (
  lineItems: Array<{ lineTotal: number }>,
  discountPercent = 0,
  taxPercent = 0,
) => {
  const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.lineTotal, 0));
  const discountAmount = roundMoney(subtotal * (discountPercent / 100));
  const taxable = roundMoney(subtotal - discountAmount);
  const taxAmount = roundMoney(taxable * (taxPercent / 100));
  const total = roundMoney(taxable + taxAmount);

  return { subtotal, discountAmount, taxAmount, total };
};

export const buildQuoteListWhere = (
  query: ListQuotesQuery,
  organizationId: string,
): Prisma.QuoteWhereInput => {
  const filters: Prisma.QuoteWhereInput = { organizationId };

  if (query.status) filters.status = query.status;
  if (query.dealId) filters.dealId = query.dealId;
  if (query.contactId) filters.contactId = query.contactId;
  if (query.companyId) filters.companyId = query.companyId;

  const search = query.search?.trim();
  if (search) {
    filters.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { quoteNumber: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  return filters;
};

export const generateQuoteNumber = (sequence: number) => {
  const year = new Date().getFullYear();
  return `Q-${year}-${String(sequence).padStart(4, "0")}`;
};

export const assertQuoteTransition = (current: QuoteStatus, next: QuoteStatus) => {
  const allowed: Record<QuoteStatus, QuoteStatus[]> = {
    DRAFT: ["SENT"],
    SENT: ["ACCEPTED", "REJECTED"],
    ACCEPTED: [],
    REJECTED: [],
  };

  if (!allowed[current].includes(next)) {
    throw new Error(`Cannot transition quote from ${current} to ${next}`);
  }
};

export const quotesToCsv = (
  quotes: Array<{
    quoteNumber: string | null;
    title: string;
    status: string;
    total: { toString(): string } | number;
    currency: string;
    validUntil: Date | null;
    deal?: { title: string } | null;
    contact?: { firstName: string; lastName: string } | null;
  }>,
) => {
  const header = "Quote Number,Title,Status,Total,Currency,Valid Until,Deal,Contact";
  const rows = quotes.map((quote) => {
    const contactName = quote.contact
      ? `${quote.contact.firstName} ${quote.contact.lastName}`.trim()
      : "";
    return [
      quote.quoteNumber ?? "",
      quote.title,
      quote.status,
      String(quote.total),
      quote.currency,
      quote.validUntil?.toISOString().slice(0, 10) ?? "",
      quote.deal?.title ?? "",
      contactName,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(",");
  });

  return [header, ...rows].join("\n");
};

export const normalizeLineItems = (lineItems: QuoteLineInput[]) =>
  lineItems.map((item, index) => {
    const discountPercent = item.discountPercent ?? 0;
    const lineTotal = calculateLineTotal(item.quantity, item.unitPrice, discountPercent);

    return {
      productId: item.productId ?? null,
      sku: item.sku ?? null,
      name: item.name ?? null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercent,
      lineTotal,
      sortOrder: item.sortOrder ?? index,
    };
  });
