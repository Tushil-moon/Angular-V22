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
