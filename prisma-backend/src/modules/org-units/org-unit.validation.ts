import { z } from "zod";

export const orgUnitTypeSchema = z.enum(["BRANCH", "DEPARTMENT", "TEAM"]);

export const orgUnitIdParamSchema = z.object({
  unitId: z.string().uuid(),
});

export const orgUnitMemberParamSchema = z.object({
  unitId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const memberProfileParamSchema = z.object({
  userId: z.string().uuid(),
});

export const createOrgUnitSchema = z.object({
  type: orgUnitTypeSchema,
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Code must be alphanumeric")
    .optional(),
  description: z.string().trim().max(500).optional(),
  parentId: z.string().uuid().optional(),
  managerUserId: z.string().uuid().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const updateOrgUnitSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Code must be alphanumeric")
    .optional(),
  description: z.string().trim().max(500).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  managerUserId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export const addOrgUnitMemberSchema = z.object({
  userId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
  title: z.string().trim().max(120).optional(),
});

export const updateMemberProfileSchema = z.object({
  managerUserId: z.string().uuid().nullable().optional(),
  jobTitle: z.string().trim().max(120).nullable().optional(),
  employeeCode: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Employee code must be alphanumeric")
    .nullable()
    .optional(),
});

export type CreateOrgUnitInput = z.infer<typeof createOrgUnitSchema>;
export type UpdateOrgUnitInput = z.infer<typeof updateOrgUnitSchema>;
export type AddOrgUnitMemberInput = z.infer<typeof addOrgUnitMemberSchema>;
export type UpdateMemberProfileInput = z.infer<typeof updateMemberProfileSchema>;
