import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const campaignTypeSchema = z.enum(["EMAIL", "EVENT"]);
export const campaignStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED"]);

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: campaignTypeSchema,
  status: campaignStatusSchema.optional(),
  budget: z.coerce.number().nonnegative().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const campaignIdParamSchema = z.object({ id: z.string().uuid() });

export const listCampaignsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: campaignStatusSchema.optional(),
  type: campaignTypeSchema.optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
