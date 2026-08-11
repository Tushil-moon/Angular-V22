import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const customerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCustomersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
  sort: z.enum(["created_at", "updated_at", "email", "last_order_at"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const listCustomerOrdersQuerySchema = paginationQuerySchema;

export const createCustomerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).default("ACTIVE"),
  acceptsMarketing: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type ListCustomerOrdersQuery = z.infer<typeof listCustomerOrdersQuerySchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
