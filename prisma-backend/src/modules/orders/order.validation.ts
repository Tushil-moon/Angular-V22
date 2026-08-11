import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const orderIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listOrdersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "PACKED",
      "SHIPPED",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
    ])
    .optional(),
  customerId: z.string().uuid().optional(),
  sort: z.enum(["created_at", "updated_at", "grand_total", "placed_at"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

const addressSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(30).optional(),
  countryCode: z.string().length(2),
  phone: z.string().max(50).optional(),
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  email: z.string().email(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  shippingAddress: addressSchema.optional(),
  billingAddress: addressSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
