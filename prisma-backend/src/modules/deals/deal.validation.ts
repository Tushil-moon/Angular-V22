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
  pipelineId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  description: z.string().max(5000).optional(),
  competitor: z.string().trim().max(200).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  tagNames: z.array(z.string().trim().min(1).max(50)).optional(),
});

export const updateDealSchema = createDealSchema.partial();

export const winDealSchema = z.object({
  winReason: z.string().trim().max(500).optional(),
});

export const loseDealSchema = z.object({
  lossReason: z.string().trim().min(1).max(500),
  competitor: z.string().trim().max(200).optional(),
});

export const reopenDealSchema = z.object({
  stage: dealStageSchema.optional(),
});

export const dealIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listDealsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  stage: dealStageSchema.optional(),
  pipelineId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  openOnly: z.coerce.boolean().optional(),
});

const importDealRowSchema = z.object({
  title: z.string().trim().min(1).max(200),
  value: z.coerce.number().nonnegative(),
  currency: z.string().length(3).optional(),
  stage: dealStageSchema.optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  description: z.string().max(5000).optional(),
  competitor: z.string().trim().max(200).optional(),
  expectedCloseDate: z.coerce.date().optional(),
});

export const importDealsSchema = z.object({
  rows: z.array(importDealRowSchema).min(1).max(500),
  skipMissingContacts: z.boolean().optional(),
});

export const importDealsCsvSchema = z.object({
  csv: z.string().trim().min(1).max(2_000_000),
  skipMissingContacts: z.boolean().optional(),
});

export const boardQuerySchema = z.object({
  pipelineId: z.string().uuid().optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type WinDealInput = z.infer<typeof winDealSchema>;
export type DisqualifyDealInput = z.infer<typeof loseDealSchema>;
export type ReopenDealInput = z.infer<typeof reopenDealSchema>;
export type ListDealsQuery = z.infer<typeof listDealsQuerySchema>;
export type ImportDealsInput = z.infer<typeof importDealsSchema>;
export type ImportDealsCsvInput = z.infer<typeof importDealsCsvSchema>;
export type BoardQuery = z.infer<typeof boardQuerySchema>;
