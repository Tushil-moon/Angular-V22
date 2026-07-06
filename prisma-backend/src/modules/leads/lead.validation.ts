import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";
import { contactStatusSchema, convertLeadSchema, leadSourceSchema } from "../contacts/contact.validation";

export const leadStageSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "UNQUALIFIED",
  "NURTURING",
  "CONVERTED",
  "LOST",
]);

export const leadRatingSchema = z.enum(["HOT", "WARM", "COLD"]);

export const createLeadSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  company: z.string().max(150).optional(),
  companyId: z.string().uuid().optional(),
  jobTitle: z.string().max(100).optional(),
  leadSource: leadSourceSchema.optional(),
  sourceDetail: z.string().trim().max(200).optional(),
  ownerId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  stage: leadStageSchema.optional(),
  nextFollowUpAt: z.coerce.date().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  tagNames: z.array(z.string().trim().min(1).max(50)).optional(),
});

export const updateLeadSchema = z.object({
  stage: leadStageSchema.optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
  qualificationNotes: z.string().trim().max(5000).nullable().optional(),
  lostReason: z.string().trim().max(500).nullable().optional(),
  ownerId: z.string().uuid().optional(),
});

export const qualifyLeadSchema = z.object({
  qualificationNotes: z.string().trim().max(5000).optional(),
});

export const disqualifyLeadSchema = z.object({
  lostReason: z.string().trim().min(1).max(500),
});

export const assignLeadSchema = z.object({
  ownerId: z.string().uuid(),
});

export const leadIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listLeadsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  stage: leadStageSchema.optional(),
  rating: leadRatingSchema.optional(),
  ownerId: z.string().uuid().optional(),
  leadSource: leadSourceSchema.optional(),
  followUpDue: z.coerce.boolean().optional(),
  minScore: z.coerce.number().int().min(0).optional(),
});

const importLeadRowSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  company: z.string().max(150).optional(),
  jobTitle: z.string().max(100).optional(),
  leadSource: leadSourceSchema.optional(),
  notes: z.string().max(5000).optional(),
  stage: leadStageSchema.optional(),
});

export const importLeadsSchema = z.object({
  rows: z.array(importLeadRowSchema).min(1).max(500),
  skipDuplicates: z.boolean().optional(),
});

export const importLeadsCsvSchema = z.object({
  csv: z.string().trim().min(1).max(2_000_000),
  skipDuplicates: z.boolean().optional(),
});

export { convertLeadSchema };

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type QualifyLeadInput = z.infer<typeof qualifyLeadSchema>;
export type DisqualifyLeadInput = z.infer<typeof disqualifyLeadSchema>;
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type ImportLeadsInput = z.infer<typeof importLeadsSchema>;
export type ImportLeadsCsvInput = z.infer<typeof importLeadsCsvSchema>;
