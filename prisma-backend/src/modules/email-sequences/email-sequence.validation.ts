import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const sequenceStepSchema = z.object({
  order: z.coerce.number().int().min(0),
  delayDays: z.coerce.number().int().min(0).optional(),
  templateId: z.string().uuid(),
});

export const createEmailSequenceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  active: z.boolean().optional(),
  steps: z.array(sequenceStepSchema).optional(),
});

export const updateEmailSequenceSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  active: z.boolean().optional(),
  steps: z.array(sequenceStepSchema).optional(),
});

export const emailSequenceIdParamSchema = z.object({ id: z.string().uuid() });

export const listEmailSequencesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

export type CreateEmailSequenceInput = z.infer<typeof createEmailSequenceSchema>;
export type UpdateEmailSequenceInput = z.infer<typeof updateEmailSequenceSchema>;
export type ListEmailSequencesQuery = z.infer<typeof listEmailSequencesQuerySchema>;
