import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const quoteStatusSchema = z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]);

export const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

export const createQuoteSchema = z.object({
  dealId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  status: quoteStatusSchema.optional(),
  total: z.coerce.number().nonnegative(),
  currency: z.string().length(3).default("USD"),
  validUntil: z.coerce.date().optional(),
  lineItems: z.array(lineItemSchema).optional(),
});

export const updateQuoteSchema = createQuoteSchema.partial();

export const quoteIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listQuotesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: quoteStatusSchema.optional(),
  dealId: z.string().uuid().optional(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type ListQuotesQuery = z.infer<typeof listQuotesQuerySchema>;
