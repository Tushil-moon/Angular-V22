import { z } from "zod";

export const organizationMemberRoleSchema = z.enum(["OWNER", "ADMIN", "MEMBER"]);

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  timezone: z.string().trim().max(60).optional(),
  currency: z.string().length(3).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  timezone: z.string().trim().max(60).optional(),
  currency: z.string().length(3).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: organizationMemberRoleSchema.optional(),
});

export const organizationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const memberUserIdParamSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

export const acceptInviteParamSchema = z.object({
  token: z.string().min(16),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
