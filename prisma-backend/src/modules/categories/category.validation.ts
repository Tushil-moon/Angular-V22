import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const categoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCategoriesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  parentId: z.string().uuid().nullable().optional(),
  sort: z.enum(["created_at", "updated_at", "name", "sort_order"]).optional().default("sort_order"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  sortOrder: z.number().int().optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
