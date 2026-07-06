import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";
import { dealStageSchema } from "../deals/deal.validation";

export const contactStatusSchema = z.enum(["LEAD", "PROSPECT", "CUSTOMER", "INACTIVE"]);
export const leadSourceSchema = z.enum([
  "WEBSITE",
  "REFERRAL",
  "CAMPAIGN",
  "COLD_CALL",
  "TRADE_SHOW",
  "PARTNER",
  "IMPORT",
  "OTHER",
]);
export const contactEmailTypeSchema = z.enum(["WORK", "PERSONAL", "OTHER"]);
export const contactPhoneTypeSchema = z.enum(["MOBILE", "WORK", "HOME", "FAX", "OTHER"]);
export const contactAddressTypeSchema = z.enum(["BILLING", "SHIPPING", "HOME", "WORK", "OTHER"]);
export const socialPlatformSchema = z.enum([
  "LINKEDIN",
  "TWITTER",
  "FACEBOOK",
  "INSTAGRAM",
  "GITHUB",
  "WEBSITE",
  "OTHER",
]);

const contactEmailInputSchema = z.object({
  email: z.string().email(),
  type: contactEmailTypeSchema.optional(),
  isPrimary: z.boolean().optional(),
});

const contactPhoneInputSchema = z.object({
  phone: z.string().trim().min(3).max(30),
  type: contactPhoneTypeSchema.optional(),
  isPrimary: z.boolean().optional(),
});

const contactAddressInputSchema = z.object({
  label: z.string().trim().max(80).optional(),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
  type: contactAddressTypeSchema.optional(),
  isPrimary: z.boolean().optional(),
});

const contactSocialLinkInputSchema = z.object({
  platform: socialPlatformSchema,
  url: z.string().url(),
});

const contactChannelsSchema = {
  emails: z.array(contactEmailInputSchema).max(20).optional(),
  phones: z.array(contactPhoneInputSchema).max(20).optional(),
  addresses: z.array(contactAddressInputSchema).max(20).optional(),
  socialLinks: z.array(contactSocialLinkInputSchema).max(20).optional(),
  leadSource: leadSourceSchema.optional(),
  sourceDetail: z.string().trim().max(200).optional(),
};

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
  ...contactChannelsSchema,
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
  leadSource: leadSourceSchema.optional(),
});

export const checkDuplicatesSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  company: z.string().trim().max(150).optional(),
  excludeContactId: z.string().uuid().optional(),
});

export const mergeContactsSchema = z.object({
  sourceContactIds: z.array(z.string().uuid()).min(1).max(10),
});

const importContactRowSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  company: z.string().max(150).optional(),
  jobTitle: z.string().max(100).optional(),
  status: contactStatusSchema.optional(),
  notes: z.string().max(5000).optional(),
  leadSource: leadSourceSchema.optional(),
});

export const importContactsSchema = z.object({
  rows: z.array(importContactRowSchema).min(1).max(500),
  skipDuplicates: z.boolean().optional(),
});

export const importContactsCsvSchema = z.object({
  csv: z.string().trim().min(1).max(2_000_000),
  skipDuplicates: z.boolean().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
export type CheckDuplicatesInput = z.infer<typeof checkDuplicatesSchema>;
export type MergeContactsInput = z.infer<typeof mergeContactsSchema>;
export type ImportContactsInput = z.infer<typeof importContactsSchema>;
export type ImportContactsCsvInput = z.infer<typeof importContactsCsvSchema>;
