import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";
import { casePrioritySchema } from "../cases/case.validation";

export const createSlaPolicySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  priority: casePrioritySchema.optional(),
  firstResponseHours: z.coerce.number().int().positive(),
  resolutionHours: z.coerce.number().int().positive(),
  active: z.boolean().optional(),
});

export const updateSlaPolicySchema = createSlaPolicySchema.partial();

export const createQueueSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  slaPolicyId: z.string().uuid().optional(),
  isDefault: z.boolean().optional(),
});

export const updateQueueSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  slaPolicyId: z.string().uuid().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const slaPolicyIdParamSchema = z.object({ id: z.string().uuid() });
export const queueIdParamSchema = z.object({ id: z.string().uuid() });

export const listSlaPoliciesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

export const listQueuesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
});

export type CreateSlaPolicyInput = z.infer<typeof createSlaPolicySchema>;
export type UpdateSlaPolicyInput = z.infer<typeof updateSlaPolicySchema>;
export type CreateQueueInput = z.infer<typeof createQueueSchema>;
export type UpdateQueueInput = z.infer<typeof updateQueueSchema>;
export type ListSlaPoliciesQuery = z.infer<typeof listSlaPoliciesQuerySchema>;
export type ListQueuesQuery = z.infer<typeof listQueuesQuerySchema>;
