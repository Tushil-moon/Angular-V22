/**
 * Validation Schemas using Zod
 * Type-safe schema validation for forms and API requests
 */

import { z } from 'zod';

/**
 * Common field schemas
 */
const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one symbol');

/**
 * Auth schemas
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const passwordResetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * User schemas
 */
export const userCreateSchema = z.object({
  email: emailSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: passwordSchema,
});

export const userUpdateSchema = z.object({
  email: emailSchema.optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  description: z.string().max(200).optional(),
});

/**
 * Type exports
 */
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

/**
 * Validate function helper
 */
export function validateData<T>(schema: z.ZodSchema, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validate function that returns errors
 */
export function safeValidate<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  data: unknown,
):
  | { success: true; data: z.infer<TSchema> }
  | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  result.error.errors.forEach((error) => {
    const path = error.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(error.message);
  });

  return { success: false, errors };
}
