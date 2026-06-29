import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createCustomFieldSchema = z.object({
  entityType: z.string().trim().min(1).max(50),
  key: z.string().trim().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(100),
  fieldType: z.string().trim().min(1).max(50),
});

export const updateCustomFieldSchema = z.object({
  label: z.string().trim().min(1).max(100).optional(),
  fieldType: z.string().trim().min(1).max(50).optional(),
});

export const customFieldIdParamSchema = z.object({ id: z.string().uuid() });

export const listCustomFieldsQuerySchema = paginationQuerySchema.extend({
  entityType: z.string().optional(),
});

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;
export type ListCustomFieldsQuery = z.infer<typeof listCustomFieldsQuerySchema>;
