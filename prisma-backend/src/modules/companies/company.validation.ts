import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

const companyLocationInputSchema = z.object({
  label: z.string().trim().max(80).optional(),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).optional(),
  isPrimary: z.boolean().optional(),
  isHeadquarters: z.boolean().optional(),
});

export const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  domain: z.string().max(150).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  parentCompanyId: z.string().uuid().optional().nullable(),
  employeeCount: z.coerce.number().int().min(0).max(10_000_000).optional(),
  annualRevenue: z.coerce.number().nonnegative().optional(),
  revenueCurrency: z.string().length(3).optional(),
  ownershipPercent: z.coerce.number().min(0).max(100).optional().nullable(),
  ownerId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  locations: z.array(companyLocationInputSchema).max(20).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const companyIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCompaniesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  industry: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  parentCompanyId: z.string().uuid().optional(),
  rootOnly: z.coerce.boolean().optional(),
});

export const checkCompanyDuplicatesSchema = z.object({
  name: z.string().trim().max(200).optional(),
  domain: z.string().max(150).optional(),
  excludeCompanyId: z.string().uuid().optional(),
});

const importCompanyRowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  domain: z.string().max(150).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal("")),
  employeeCount: z.coerce.number().int().min(0).optional(),
  annualRevenue: z.coerce.number().nonnegative().optional(),
  revenueCurrency: z.string().length(3).optional(),
  parentDomain: z.string().max(150).optional(),
  ownershipPercent: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(5000).optional(),
});

export const importCompaniesSchema = z.object({
  rows: z.array(importCompanyRowSchema).min(1).max(500),
  skipDuplicates: z.boolean().optional(),
});

export const importCompaniesCsvSchema = z.object({
  csv: z.string().trim().min(1).max(2_000_000),
  skipDuplicates: z.boolean().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;
export type CheckCompanyDuplicatesInput = z.infer<typeof checkCompanyDuplicatesSchema>;
export type ImportCompaniesInput = z.infer<typeof importCompaniesSchema>;
export type ImportCompaniesCsvInput = z.infer<typeof importCompaniesCsvSchema>;
