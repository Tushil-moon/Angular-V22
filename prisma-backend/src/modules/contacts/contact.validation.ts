import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const contactStatusSchema = z.enum(["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE"]);

export const createContactSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  company: z.string().max(150).optional(),
  jobTitle: z.string().max(100).optional(),
  status: contactStatusSchema.optional(),
  ownerId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const contactIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listContactsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: contactStatusSchema.optional(),
  ownerId: z.string().uuid().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
