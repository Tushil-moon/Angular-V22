import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const quoteStatusSchema = z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]);

export const lineItemSchema = z.object({
  productId: z.string().uuid().optional(),
  sku: z.string().trim().max(100).optional(),
  name: z.string().trim().max(200).optional(),
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const createQuoteSchema = z.object({
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  status: quoteStatusSchema.optional(),
  currency: z.string().length(3).default("USD"),
  validUntil: z.coerce.date().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().trim().max(5000).optional(),
  lineItems: z.array(lineItemSchema).optional(),
});

export const updateQuoteSchema = z.object({
  dealId: z.string().uuid().nullable().optional(),
  contactId: z.string().uuid().nullable().optional(),
  companyId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  status: quoteStatusSchema.optional(),
  currency: z.string().length(3).optional(),
  validUntil: z.coerce.date().nullable().optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  lineItems: z.array(lineItemSchema).optional(),
});

export const quoteIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listQuotesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: quoteStatusSchema.optional(),
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
});

export const exportQuotesQuerySchema = listQuotesQuerySchema.omit({ page: true, pageSize: true });

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type ListQuotesQuery = z.infer<typeof listQuotesQuerySchema>;
export type ExportQuotesQuery = z.infer<typeof exportQuotesQuerySchema>;
