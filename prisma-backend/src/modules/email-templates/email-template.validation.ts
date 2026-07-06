import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createEmailTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subject: z.string().trim().min(1).max(300),
  bodyHtml: z.string().min(1),
  category: z.string().trim().max(100).optional(),
  previewText: z.string().trim().max(300).optional(),
  active: z.boolean().optional(),
});

export const updateEmailTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  subject: z.string().trim().min(1).max(300).optional(),
  bodyHtml: z.string().min(1).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  previewText: z.string().trim().max(300).nullable().optional(),
  active: z.boolean().optional(),
});

export const emailTemplateIdParamSchema = z.object({ id: z.string().uuid() });

export const listEmailTemplatesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  active: z.coerce.boolean().optional(),
  category: z.string().optional(),
});

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type UpdateEmailTemplateInput = z.infer<typeof updateEmailTemplateSchema>;
export type ListEmailTemplatesQuery = z.infer<typeof listEmailTemplatesQuerySchema>;
