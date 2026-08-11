import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const brandIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listBrandsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sort: z.enum(["created_at", "updated_at", "name", "sort_order"]).optional().default("name"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const createBrandSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  sortOrder: z.number().int().optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
});

export const updateBrandSchema = createBrandSchema.partial();

export type ListBrandsQuery = z.infer<typeof listBrandsQuerySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
