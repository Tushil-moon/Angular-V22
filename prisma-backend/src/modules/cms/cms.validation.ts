import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const cmsPageIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const cmsBannerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCmsPagesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  sort: z.enum(["created_at", "updated_at", "title"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createCmsPageSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  body: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  publishedAt: z.coerce.date().optional().nullable(),
});

export const updateCmsPageSchema = createCmsPageSchema.partial();

export const listCmsBannersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  enabled: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z.enum(["created_at", "updated_at", "sort_order", "title"]).optional().default("sort_order"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const createCmsBannerSchema = z.object({
  title: z.string().min(1).max(255),
  subtitle: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  linkUrl: z.string().url().optional().nullable().or(z.literal("")),
  position: z.string().max(100).optional().nullable(),
  sortOrder: z.number().int().optional(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  enabled: z.boolean().optional(),
});

export const updateCmsBannerSchema = createCmsBannerSchema.partial();

export const cmsMenuIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCmsMenusQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  sort: z.enum(["created_at", "updated_at", "name"]).optional().default("name"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const createCmsMenuSchema = z.object({
  name: z.string().min(1).max(255),
  handle: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export const updateCmsMenuSchema = createCmsMenuSchema.partial();

export type ListCmsPagesQuery = z.infer<typeof listCmsPagesQuerySchema>;
export type CreateCmsPageInput = z.infer<typeof createCmsPageSchema>;
export type UpdateCmsPageInput = z.infer<typeof updateCmsPageSchema>;
export type ListCmsBannersQuery = z.infer<typeof listCmsBannersQuerySchema>;
export type CreateCmsBannerInput = z.infer<typeof createCmsBannerSchema>;
export type UpdateCmsBannerInput = z.infer<typeof updateCmsBannerSchema>;
export type ListCmsMenusQuery = z.infer<typeof listCmsMenusQuerySchema>;
export type CreateCmsMenuInput = z.infer<typeof createCmsMenuSchema>;
export type UpdateCmsMenuInput = z.infer<typeof updateCmsMenuSchema>;
