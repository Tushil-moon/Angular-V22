import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createAiFeatureFlagSchema = z.object({
  feature: z.string().trim().min(1).max(100),
  enabled: z.boolean().optional(),
});

export const updateAiFeatureFlagSchema = z.object({
  enabled: z.boolean(),
});

export const aiFeatureFlagIdParamSchema = z.object({ id: z.string().uuid() });

export const listAiFeatureFlagsQuerySchema = paginationQuerySchema;

export const createAiInsightSchema = z.object({
  entityType: z.string().trim().min(1).max(50),
  entityId: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(100),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const aiInsightIdParamSchema = z.object({ id: z.string().uuid() });

export const listAiInsightsQuerySchema = paginationQuerySchema.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export type CreateAiFeatureFlagInput = z.infer<typeof createAiFeatureFlagSchema>;
export type UpdateAiFeatureFlagInput = z.infer<typeof updateAiFeatureFlagSchema>;
export type ListAiFeatureFlagsQuery = z.infer<typeof listAiFeatureFlagsQuerySchema>;
export type CreateAiInsightInput = z.infer<typeof createAiInsightSchema>;
export type ListAiInsightsQuery = z.infer<typeof listAiInsightsQuerySchema>;
