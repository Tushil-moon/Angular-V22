import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const dealStageSchema = z.enum([
  "LEAD",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
]);

export const createDealSchema = z.object({
  title: z.string().trim().min(1).max(200),
  value: z.coerce.number().nonnegative(),
  currency: z.string().length(3).default("USD"),
  stage: dealStageSchema.optional(),
  contactId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  expectedCloseDate: z.coerce.date().optional(),
  description: z.string().max(5000).optional(),
});

export const updateDealSchema = createDealSchema.partial();

export const dealIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listDealsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  stage: dealStageSchema.optional(),
  contactId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type ListDealsQuery = z.infer<typeof listDealsQuerySchema>;
