import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import { env, isProduction } from "../config/env";
import { logger } from "../config/logger";
import { buildEmailVerificationTemplate } from "./templates/email-verification.template";
import { buildPasswordResetTemplate } from "./templates/password-reset.template";

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (!env.EMAIL_ENABLED || !env.SMTP_HOST) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }

  return transporter;
};

const sendOrLog = async (to: string, subject: string, html: string, text: string, devToken?: string) => {
  const mailer = getTransporter();

  if (mailer) {
    await mailer.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
      text,
    });
    logger.info({ to, subject }, "Email sent");
    return;
  }

  logger.info(
    {
      to,
      subject,
      token: isProduction ? undefined : devToken,
      preview: isProduction ? undefined : text.slice(0, 200),
    },
    "Email delivery skipped (SMTP not configured)",
  );
};

export const emailService = {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${env.FRONTEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}`;
    const { subject, html, text } = buildEmailVerificationTemplate({ verifyUrl });
    await sendOrLog(email, subject, html, text, token);
  },

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}`;
    const { subject, html, text } = buildPasswordResetTemplate({ resetUrl });
    await sendOrLog(email, subject, html, text, token);
  },
};
