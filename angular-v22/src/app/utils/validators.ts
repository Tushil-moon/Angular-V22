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

export const contactStatusSchema = z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'INACTIVE']);

export const createContactSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().max(30).optional(),
    company: z.string().max(150).optional(),
    jobTitle: z.string().max(100).optional(),
    status: contactStatusSchema.optional(),
    notes: z.string().max(5000).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const dealStageSchema = z.enum([
    'LEAD',
    'QUALIFIED',
    'PROPOSAL',
    'NEGOTIATION',
    'WON',
    'LOST',
]);

export const createDealSchema = z.object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    value: z.coerce.number().nonnegative('Value must be zero or greater'),
    currency: z.string().length(3).default('USD'),
    stage: dealStageSchema.optional(),
    contactId: z.string().uuid().optional().or(z.literal('')),
    expectedCloseDate: z.string().optional(),
    description: z.string().max(5000).optional(),
});

export const updateDealSchema = createDealSchema.partial();

export const activityTypeSchema = z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK']);

export const createActivitySchema = z.object({
    type: activityTypeSchema.optional(),
    subject: z.string().trim().min(1, 'Subject is required').max(200),
    body: z.string().max(5000).optional(),
    dueAt: z.string().optional(),
    contactId: z.string().uuid().optional().or(z.literal('')),
    dealId: z.string().uuid().optional().or(z.literal('')),
});

export const updateActivitySchema = createActivitySchema.partial();

export const createCompanySchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    domain: z.string().max(150).optional(),
    industry: z.string().max(100).optional(),
    size: z.string().max(50).optional(),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    address: z.string().max(500).optional(),
    notes: z.string().max(5000).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

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
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

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
