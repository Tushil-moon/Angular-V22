import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  phone: z.string().optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "LOCKED"]).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});
