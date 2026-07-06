import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const campaignTypeSchema = z.enum(["EMAIL", "EVENT"]);
export const campaignStatusSchema = z.enum(["DRAFT", "ACTIVE", "COMPLETED"]);

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  type: campaignTypeSchema,
  status: campaignStatusSchema.optional(),
  budget: z.coerce.number().nonnegative().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  ownerId: z.string().uuid().optional(),
  emailTemplateId: z.string().uuid().optional(),
  emailSequenceId: z.string().uuid().optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  type: campaignTypeSchema.optional(),
  status: campaignStatusSchema.optional(),
  budget: z.coerce.number().nonnegative().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  ownerId: z.string().uuid().nullable().optional(),
  emailTemplateId: z.string().uuid().nullable().optional(),
  emailSequenceId: z.string().uuid().nullable().optional(),
});

export const campaignIdParamSchema = z.object({ id: z.string().uuid() });

export const addCampaignMembersSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1),
});

export const removeCampaignMemberSchema = z.object({
  contactId: z.string().uuid(),
});

export const listCampaignsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: campaignStatusSchema.optional(),
  type: campaignTypeSchema.optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
export type AddCampaignMembersInput = z.infer<typeof addCampaignMembersSchema>;
export type RemoveCampaignMemberInput = z.infer<typeof removeCampaignMemberSchema>;
