import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createLeadScoreRuleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  field: z.string().trim().min(1).max(100),
  operator: z.string().trim().min(1).max(20),
  value: z.string().trim().min(1).max(200),
  points: z.coerce.number().int(),
  active: z.boolean().optional(),
});

export const updateLeadScoreRuleSchema = createLeadScoreRuleSchema.partial();

export const leadScoreRuleIdParamSchema = z.object({ id: z.string().uuid() });

export const listLeadScoreRulesQuerySchema = paginationQuerySchema.extend({
  active: z.coerce.boolean().optional(),
});

export type CreateLeadScoreRuleInput = z.infer<typeof createLeadScoreRuleSchema>;
export type UpdateLeadScoreRuleInput = z.infer<typeof updateLeadScoreRuleSchema>;
export type ListLeadScoreRulesQuery = z.infer<typeof listLeadScoreRulesQuerySchema>;
