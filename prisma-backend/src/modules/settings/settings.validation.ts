import { z } from "zod";

export const updateStoreSettingsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  timezone: z.string().max(100).optional(),
  currencyCode: z.string().length(3).optional(),
  locale: z.string().max(20).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
  legalName: z.string().max(255).optional().nullable(),
  supportEmail: z.string().email().optional().nullable(),
  supportPhone: z.string().max(50).optional().nullable(),
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(30).optional().nullable(),
  countryCode: z.string().length(2).optional().nullable(),
  weightUnit: z.string().max(10).optional(),
  dimensionUnit: z.string().max(10).optional(),
  taxInclusivePricing: z.boolean().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  orderNumberPrefix: z.string().min(1).max(20).optional(),
  allowGuestCheckout: z.boolean().optional(),
  inventoryTracking: z.boolean().optional(),
});

export type UpdateStoreSettingsInput = z.infer<typeof updateStoreSettingsSchema>;
