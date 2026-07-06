export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export const buildEmailVerificationTemplate = (input: { verifyUrl: string }): EmailTemplate => ({
  subject: "Verify your email address",
  html: `
    <p>Please verify your email address to activate your CRM account.</p>
    <p><a href="${input.verifyUrl}">Verify email</a></p>
    <p>If you did not create an account, you can ignore this message.</p>
  `,
  text: `Verify your email: ${input.verifyUrl}`,
});
