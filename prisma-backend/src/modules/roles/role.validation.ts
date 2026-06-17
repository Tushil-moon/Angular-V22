import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
});

export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleName: z.string().min(2).max(50),
});

export const removeRoleSchema = assignRoleSchema;

export const roleIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()).min(1),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type RemoveRoleInput = z.infer<typeof removeRoleSchema>;
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;
