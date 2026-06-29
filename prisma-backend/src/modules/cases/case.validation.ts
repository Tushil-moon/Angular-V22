import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const caseStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]);

export const createCaseSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  status: caseStatusSchema.optional(),
  priority: z.string().trim().min(1).max(20).optional(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const updateCaseSchema = createCaseSchema.partial();

export const caseIdParamSchema = z.object({ id: z.string().uuid() });

export const listCasesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: caseStatusSchema.optional(),
  assigneeId: z.string().uuid().optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type ListCasesQuery = z.infer<typeof listCasesQuerySchema>;
