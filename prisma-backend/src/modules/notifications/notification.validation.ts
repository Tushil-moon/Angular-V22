import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const templateIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["PENDING", "SENT", "FAILED", "READ"]).optional(),
  sort: z.enum(["created_at"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const listTemplatesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  channel: z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"]).optional(),
  enabled: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z.enum(["created_at", "updated_at", "name", "code"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createTemplateSchema = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  channel: z.enum(["IN_APP", "EMAIL", "SMS", "PUSH"]),
  subject: z.string().max(500).optional().nullable(),
  body: z.string().min(1),
  enabled: z.boolean().optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial();

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
