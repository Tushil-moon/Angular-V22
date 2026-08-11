import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const collectionIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCollectionsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sort: z.enum(["created_at", "updated_at", "name", "sort_order"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().optional().nullable(),
  type: z.enum(["MANUAL", "RULE_BASED"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateCollectionSchema = createCollectionSchema.partial();

export type ListCollectionsQuery = z.infer<typeof listCollectionsQuerySchema>;
export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
