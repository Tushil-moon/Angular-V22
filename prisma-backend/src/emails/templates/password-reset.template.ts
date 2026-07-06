import type { EmailTemplate } from "./email-verification.template";

export const buildPasswordResetTemplate = (input: { resetUrl: string }): EmailTemplate => ({
  subject: "Reset your password",
  html: `
    <p>We received a request to reset your password.</p>
    <p><a href="${input.resetUrl}">Reset password</a></p>
    <p>If you did not request this, you can ignore this message.</p>
  `,
  text: `Reset your password: ${input.resetUrl}`,
});
