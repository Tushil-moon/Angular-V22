import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
  domain: z.string().max(150).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  ownerId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const companyIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCompaniesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  industry: z.string().optional(),
  ownerId: z.string().uuid().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;
