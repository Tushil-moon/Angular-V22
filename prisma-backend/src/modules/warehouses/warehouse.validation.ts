import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const warehouseIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listWarehousesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  sort: z.enum(["created_at", "updated_at", "name", "code"]).optional().default("name"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  isDefault: z.boolean().optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(30).optional(),
  countryCode: z.string().length(2).optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export type ListWarehousesQuery = z.infer<typeof listWarehousesQuerySchema>;
export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
