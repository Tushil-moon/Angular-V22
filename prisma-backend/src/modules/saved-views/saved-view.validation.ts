import { z } from "zod";

export const savedViewEntitySchema = z.enum(["CONTACTS", "DEALS", "COMPANIES", "ACTIVITIES"]);

export const createSavedViewSchema = z.object({
  entityType: savedViewEntitySchema,
  name: z.string().trim().min(1).max(100),
  filters: z.record(z.string(), z.unknown()).default({}),
  sort: z.record(z.string(), z.unknown()).optional(),
  columns: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export const updateSavedViewSchema = createSavedViewSchema.partial().omit({ entityType: true });

export const savedViewIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listSavedViewsQuerySchema = z.object({
  entityType: savedViewEntitySchema,
});

export type CreateSavedViewInput = z.infer<typeof createSavedViewSchema>;
export type UpdateSavedViewInput = z.infer<typeof updateSavedViewSchema>;
export type ListSavedViewsQuery = z.infer<typeof listSavedViewsQuerySchema>;
