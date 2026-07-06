import type { Prisma } from "@prisma/client";

const ownerSelect = { id: true, email: true } as const;

export const quoteLineItemSelect = {
  id: true,
  productId: true,
  sku: true,
  name: true,
  description: true,
  quantity: true,
  unitPrice: true,
  discountPercent: true,
  lineTotal: true,
  sortOrder: true,
  product: { select: { id: true, sku: true, name: true, status: true } },
} satisfies Prisma.QuoteLineItemSelect;

export const quoteSelect = {
  id: true,
  organizationId: true,
  dealId: true,
  contactId: true,
  companyId: true,
  ownerId: true,
  quoteNumber: true,
  title: true,
  status: true,
  subtotal: true,
  discountPercent: true,
  taxPercent: true,
  total: true,
  currency: true,
  validUntil: true,
  notes: true,
  sentAt: true,
  acceptedAt: true,
  rejectedAt: true,
  createdAt: true,
  updatedAt: true,
  deal: { select: { id: true, title: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
  owner: { select: ownerSelect },
  lineItems: { orderBy: { sortOrder: "asc" }, select: quoteLineItemSelect },
} satisfies Prisma.QuoteSelect;

type QuoteRow = Prisma.QuoteGetPayload<{ select: typeof quoteSelect }>;
type QuoteLineRow = Prisma.QuoteLineItemGetPayload<{ select: typeof quoteLineItemSelect }>;

const mapOwner = (owner: { id: string; email: string | null } | null) =>
  owner ? { id: owner.id, email: owner.email } : null;

const toNumber = (value: Prisma.Decimal | number) => Number(value);

export const mapQuoteLineItem = (item: QuoteLineRow) => ({
  id: item.id,
  productId: item.productId,
  sku: item.sku,
  name: item.name,
  description: item.description,
  quantity: toNumber(item.quantity),
  unitPrice: toNumber(item.unitPrice),
  discountPercent: toNumber(item.discountPercent),
  lineTotal: toNumber(item.lineTotal),
  sortOrder: item.sortOrder,
  product: item.product,
});

export const mapQuote = (quote: QuoteRow) => ({
  id: quote.id,
  organizationId: quote.organizationId,
  dealId: quote.dealId,
  contactId: quote.contactId,
  companyId: quote.companyId,
  ownerId: quote.ownerId,
  quoteNumber: quote.quoteNumber,
  title: quote.title,
  status: quote.status,
  subtotal: toNumber(quote.subtotal),
  discountPercent: toNumber(quote.discountPercent),
  taxPercent: toNumber(quote.taxPercent),
  total: toNumber(quote.total),
  currency: quote.currency,
  validUntil: quote.validUntil,
  notes: quote.notes,
  sentAt: quote.sentAt,
  acceptedAt: quote.acceptedAt,
  rejectedAt: quote.rejectedAt,
  deal: quote.deal,
  contact: quote.contact
    ? {
        id: quote.contact.id,
        fullName: `${quote.contact.firstName} ${quote.contact.lastName}`.trim(),
      }
    : null,
  company: quote.company,
  owner: mapOwner(quote.owner),
  lineItems: quote.lineItems.map(mapQuoteLineItem),
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
});

export const productSelect = {
  id: true,
  organizationId: true,
  sku: true,
  name: true,
  description: true,
  unitPrice: true,
  currency: true,
  category: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

export const mapProduct = (product: ProductRow) => ({
  id: product.id,
  organizationId: product.organizationId,
  sku: product.sku,
  name: product.name,
  description: product.description,
  unitPrice: toNumber(product.unitPrice),
  currency: product.currency,
  category: product.category,
  status: product.status,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

export const mapQuoteHistoryEntry = (entry: {
  id: string;
  action: string;
  details: unknown;
  createdAt: Date;
  user: { id: string; email: string | null } | null;
}) => ({
  id: entry.id,
  action: entry.action,
  details: entry.details,
  createdAt: entry.createdAt,
  user: mapOwner(entry.user),
});
