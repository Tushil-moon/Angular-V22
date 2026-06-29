import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string().trim().min(1)).min(1),
  secret: z.string().trim().min(8).max(200).optional(),
  active: z.boolean().optional(),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string().trim().min(1)).min(1).optional(),
  secret: z.string().trim().min(8).max(200).optional(),
  active: z.boolean().optional(),
});

export const webhookIdParamSchema = z.object({ id: z.string().uuid() });

export const listWebhooksQuerySchema = paginationQuerySchema.extend({
  active: z.coerce.boolean().optional(),
});

export const listWebhookDeliveriesQuerySchema = paginationQuerySchema;

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type ListWebhooksQuery = z.infer<typeof listWebhooksQuerySchema>;
export type ListWebhookDeliveriesQuery = z.infer<typeof listWebhookDeliveriesQuerySchema>;
