import { z } from "zod";

const passwordSchema = z
  .string()
  .min(10)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");

const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, for example +919999999999");

export const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: phoneSchema.optional(),
  password: passwordSchema,
  deviceName: z.string().max(100).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
}).refine((value) => value.email || value.phone, {
  message: "Email or phone is required",
  path: ["email"],
});

export const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: phoneSchema.optional(),
  password: z.string().min(1),
  deviceName: z.string().max(100).optional(),
}).refine((value) => value.email || value.phone, {
  message: "Email or phone is required",
  path: ["email"],
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const requestOtpSchema = z.object({
  phone: phoneSchema,
  purpose: z.enum(["LOGIN", "PHONE_VERIFICATION"]).default("LOGIN"),
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6),
  purpose: z.enum(["LOGIN", "PHONE_VERIFICATION"]),
  deviceName: z.string().max(100).optional(),
});

export const requestEmailVerificationSchema = z.object({
  email: z.string().email(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(20),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const linkPhoneSchema = z.object({
  phone: phoneSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
