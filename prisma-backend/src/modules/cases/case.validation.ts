import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const caseStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
export const casePrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const createCaseSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10000).optional(),
  status: caseStatusSchema.optional(),
  priority: casePrioritySchema.optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  queueId: z.string().uuid().optional(),
  slaPolicyId: z.string().uuid().optional(),
});

export const updateCaseSchema = z.object({
  subject: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  status: caseStatusSchema.optional(),
  priority: casePrioritySchema.optional(),
  contactId: z.string().uuid().nullable().optional(),
  companyId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  queueId: z.string().uuid().nullable().optional(),
  slaPolicyId: z.string().uuid().nullable().optional(),
});

export const caseIdParamSchema = z.object({ id: z.string().uuid() });

export const addCaseCommentSchema = z.object({
  body: z.string().trim().min(1).max(10000),
  isInternal: z.boolean().optional(),
});

export const assignCaseSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
});

export const listCasesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: caseStatusSchema.optional(),
  priority: casePrioritySchema.optional(),
  assigneeId: z.string().uuid().optional(),
  queueId: z.string().uuid().optional(),
  slaBreached: z.coerce.boolean().optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type ListCasesQuery = z.infer<typeof listCasesQuerySchema>;
export type AddCaseCommentInput = z.infer<typeof addCaseCommentSchema>;
export type AssignCaseInput = z.infer<typeof assignCaseSchema>;
