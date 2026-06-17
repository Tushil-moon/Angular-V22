import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";
import { dealStageSchema } from "../deals/deal.validation";

export const contactStatusSchema = z.enum(["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE"]);

export const createContactSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  company: z.string().max(150).optional(),
  companyId: z.string().uuid().optional(),
  jobTitle: z.string().max(100).optional(),
  status: contactStatusSchema.optional(),
  ownerId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  tagNames: z.array(z.string().trim().min(1).max(50)).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const convertLeadSchema = z.object({
  status: z.enum(["PROSPECT", "CUSTOMER"]).default("PROSPECT"),
  deal: z
    .object({
      title: z.string().trim().min(1).max(200),
      value: z.coerce.number().nonnegative(),
      stage: dealStageSchema.optional(),
      currency: z.string().length(3).optional(),
    })
    .optional(),
});

export const contactIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listContactsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: contactStatusSchema.optional(),
  ownerId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
