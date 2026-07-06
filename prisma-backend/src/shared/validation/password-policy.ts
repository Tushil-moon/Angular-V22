import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 10;

export const passwordPolicySchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");

export const PASSWORD_POLICY_RULES = [
  { id: "min_length", label: `At least ${PASSWORD_MIN_LENGTH} characters` },
  { id: "lowercase", label: "One lowercase letter" },
  { id: "uppercase", label: "One uppercase letter" },
  { id: "number", label: "One number" },
  { id: "symbol", label: "One special character" },
] as const;

export type PasswordPolicyRuleId = (typeof PASSWORD_POLICY_RULES)[number]["id"];

export const evaluatePasswordPolicy = (password: string): Record<PasswordPolicyRuleId, boolean> => ({
  min_length: password.length >= PASSWORD_MIN_LENGTH,
  lowercase: /[a-z]/.test(password),
  uppercase: /[A-Z]/.test(password),
  number: /[0-9]/.test(password),
  symbol: /[^A-Za-z0-9]/.test(password),
});

export const getPasswordPolicyIssues = (password: string): string[] => {
  const checks = evaluatePasswordPolicy(password);
  return PASSWORD_POLICY_RULES.filter((rule) => !checks[rule.id]).map((rule) => rule.label);
};

export const isPasswordPolicyCompliant = (password: string): boolean =>
  getPasswordPolicyIssues(password).length === 0;
