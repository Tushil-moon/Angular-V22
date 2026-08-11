import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const supplierIdParamSchema = z.object({ id: z.string().uuid() });

export const listSuppliersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  sort: z.enum(["created_at", "updated_at", "name"]).optional().default("name"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
  contactName: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
