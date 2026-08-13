import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const productIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const variantIdParamSchema = z.object({
  id: z.string().uuid(),
  variantId: z.string().uuid(),
});

export const listProductsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  brandId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(["SIMPLE", "VARIABLE", "DIGITAL", "PHYSICAL", "SUBSCRIPTION", "BUNDLE"]).optional(),
  sort: z.enum(["created_at", "updated_at", "name", "status"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  type: z.enum(["SIMPLE", "VARIABLE", "DIGITAL", "PHYSICAL", "SUBSCRIPTION", "BUNDLE"]).default("SIMPLE"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  visibility: z.enum(["VISIBLE", "HIDDEN", "CATALOG_ONLY", "SEARCH_ONLY"]).default("VISIBLE"),
  brandId: z.string().uuid().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  featured: z.boolean().optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  price: z.number().nonnegative().optional(),
  compareAtPrice: z.number().nonnegative().optional(),
  sku: z.string().max(100).optional(),
  trackInventory: z.boolean().optional(),
  initialStock: z.number().int().nonnegative().optional(),
  primaryImage: z
    .object({
      url: z.string().min(1).max(2048),
      altText: z.string().max(255).optional(),
      mediaId: z.string().uuid().optional(),
    })
    .optional(),
  images: z
    .array(
      z.object({
        url: z.string().min(1).max(2048),
        altText: z.string().max(255).optional(),
        mediaId: z.string().uuid().optional(),
        position: z.number().int().nonnegative().optional(),
      }),
    )
    .max(20)
    .optional(),
});

export const productImageIdParamSchema = z.object({
  id: z.string().uuid(),
  imageId: z.string().uuid(),
});

export const addProductImageSchema = z.object({
  url: z.string().min(1).max(2048),
  altText: z.string().max(255).optional(),
  mediaId: z.string().uuid().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const updateProductImageSchema = addProductImageSchema.partial();

export const reorderProductImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  sku: z.string().min(1).max(100),
  title: z.string().max(255).optional(),
  barcode: z.string().max(100).optional(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  trackInventory: z.boolean().optional(),
  optionValueIds: z.array(z.string().uuid()).optional(),
});

export const updateVariantSchema = createVariantSchema.partial();

export const BULK_IMPORT_MAX_ROWS = 100;

export const productImportCsvFieldsSchema = z.record(z.string(), z.string());

export const bulkImportProductItemSchema = z.object({
  row: z.number().int().positive().optional(),
  fields: productImportCsvFieldsSchema,
});

export const bulkImportProductsSchema = z.object({
  products: z.array(bulkImportProductItemSchema).min(1).max(BULK_IMPORT_MAX_ROWS),
  dryRun: z.boolean().optional().default(false),
  defaultStatus: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().default("DRAFT"),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type AddProductImageInput = z.infer<typeof addProductImageSchema>;
export type UpdateProductImageInput = z.infer<typeof updateProductImageSchema>;
export type ReorderProductImagesInput = z.infer<typeof reorderProductImagesSchema>;
export type BulkImportProductsInput = z.infer<typeof bulkImportProductsSchema>;
