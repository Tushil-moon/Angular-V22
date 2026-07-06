import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const productStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const createProductSchema = z.object({
  sku: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  unitPrice: z.coerce.number().nonnegative(),
  currency: z.string().length(3).default("USD"),
  category: z.string().trim().max(100).optional(),
  status: productStatusSchema.optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listProductsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: productStatusSchema.optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
