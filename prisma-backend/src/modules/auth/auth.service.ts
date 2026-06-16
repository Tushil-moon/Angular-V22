import { env, isProduction } from "../../config/env";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { Roles } from "../../shared/constants/roles";
import { AppError } from "../../shared/errors/app-error";
import {
  generateOtp,
  hashOtp,
  hashPassword,
  randomToken,
  sha256,
  verifyPassword,
} from "../../shared/utils/crypto";
import { signAccessToken, signEmailToken, signPasswordResetToken } from "../../shared/utils/jwt";
import type { LoginInput, RegisterInput, VerifyOtpInput } from "./auth.validation";

const AuditAction = {
  REGISTER: "REGISTER",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  LOGOUT_ALL: "LOGOUT_ALL",
  REFRESH_ROTATED: "REFRESH_ROTATED",
  EMAIL_VERIFICATION_SENT: "EMAIL_VERIFICATION_SENT",
  EMAIL_VERIFIED: "EMAIL_VERIFIED",
  PHONE_OTP_SENT: "PHONE_OTP_SENT",
  PHONE_VERIFIED: "PHONE_VERIFIED",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
} as const;

const VerificationTokenType = {
  EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
  PASSWORD_RESET: "PASSWORD_RESET",
} as const;

type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
type OtpPurpose = "LOGIN" | "PHONE_VERIFICATION";

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
  deviceId: string;
};

const publicUserSelect = {
  id: true,
  email: true,
  phone: true,
  emailVerified: true,
  phoneVerified: true,
  status: true,
  createdAt: true,
  roles: { include: { role: true } },
} as const;

const addDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const addMinutes = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000);

const normalizeUser = (user: { roles: { role: { name: string } }[] } & Record<string, unknown>) => ({
  ...user,
  roles: user.roles.map((userRole) => userRole.role.name),
});

const audit = (action: AuditAction, meta: RequestMeta, userId?: string, metadata?: Record<string, unknown>) =>
  prisma.auditLog.create({
    data: {
      action,
      userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: metadata as never,
    },
  });

const ensureRole = async (name: string) =>
  prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, description: `${name} role` },
  });

const createTokens = async (userId: string, roles: string[], meta: RequestMeta, deviceName?: string) => {
  const session = await prisma.session.upsert({
    where: { userId_deviceId: { userId, deviceId: meta.deviceId } },
    update: {
      revokedAt: null,
      deviceName,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      lastActiveAt: new Date(),
    },
    create: {
      userId,
      deviceId: meta.deviceId,
      deviceName,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  const refreshToken = randomToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      sessionId: session.id,
      tokenHash: sha256(refreshToken),
      expiresAt: addDays(env.REFRESH_TOKEN_TTL_DAYS),
    },
  });

  return {
    accessToken: signAccessToken({ sub: userId, sessionId: session.id, roles }),
    refreshToken,
    sessionId: session.id,
  };
};

const registerAccountProvider = (userId: string, provider: "EMAIL" | "PHONE", providerAccountId: string) =>
  prisma.account.upsert({
    where: { provider_providerAccountId: { provider, providerAccountId } },
    update: { userId },
    create: { userId, provider, providerAccountId },
  });

export class AuthService {
  async register(input: RegisterInput, meta: RequestMeta) {
    const passwordHash = await hashPassword(input.password);
    const userRole = await ensureRole(Roles.User);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          input.email ? { email: input.email.toLowerCase() } : undefined,
          input.phone ? { phone: input.phone } : undefined,
        ].filter(Boolean) as { email?: string; phone?: string }[],
      },
    });

    if (existing) throw new AppError(409, "User already exists", "USER_EXISTS");

    const user = await prisma.user.create({
      data: {
        email: input.email?.toLowerCase(),
        phone: input.phone,
        passwordHash,
        roles: { create: { roleId: userRole.id } },
      },
      select: publicUserSelect,
    });

    if (input.email) await registerAccountProvider(user.id, "EMAIL", input.email.toLowerCase());
    if (input.phone) await registerAccountProvider(user.id, "PHONE", input.phone);

    await audit(AuditAction.REGISTER, meta, user.id);

    const tokens = await createTokens(user.id, [Roles.User], meta, input.deviceName);
    return { user: normalizeUser(user), ...tokens };
  }

  async login(input: LoginInput, meta: RequestMeta) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          input.email ? { email: input.email.toLowerCase() } : undefined,
          input.phone ? { phone: input.phone } : undefined,
        ].filter(Boolean) as { email?: string; phone?: string }[],
        deletedAt: null,
      },
      include: { roles: { include: { role: true } } },
    });

    if (!user || !user.passwordHash) {
      await audit(AuditAction.LOGIN_FAILED, meta, undefined, { identifier: input.email ?? input.phone });
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(423, "Account is temporarily locked", "ACCOUNT_LOCKED", { lockedUntil: user.lockedUntil });
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedLoginAttempts >= env.MAX_LOGIN_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts,
          status: shouldLock ? "LOCKED" : user.status,
          lockedUntil: shouldLock ? addMinutes(env.LOCKOUT_MINUTES) : user.lockedUntil,
        },
      });
      await audit(shouldLock ? AuditAction.ACCOUNT_LOCKED : AuditAction.LOGIN_FAILED, meta, user.id);
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const roles = user.roles.map((userRole) => userRole.role.name);
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, status: "ACTIVE", lastLoginAt: new Date() },
    });

    await audit(AuditAction.LOGIN_SUCCESS, meta, user.id);
    const tokens = await createTokens(user.id, roles, meta, input.deviceName);
    return { user: normalizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const tokenHash = sha256(refreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { roles: { include: { role: true } } } }, session: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.session.revokedAt) {
      throw new AppError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    const roles = stored.user.roles.map((userRole) => userRole.role.name);
    const nextRefreshToken = randomToken();
    const next = await prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        sessionId: stored.sessionId,
        tokenHash: sha256(nextRefreshToken),
        expiresAt: addDays(env.REFRESH_TOKEN_TTL_DAYS),
      },
    });

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenId: next.id },
    });
    await audit(AuditAction.REFRESH_ROTATED, meta, stored.userId, { sessionId: stored.sessionId });

    return {
      accessToken: signAccessToken({ sub: stored.userId, sessionId: stored.sessionId, roles }),
      refreshToken: nextRefreshToken,
    };
  }

  async logout(userId: string, sessionId: string, meta: RequestMeta) {
    await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    await prisma.refreshToken.updateMany({ where: { userId, sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(AuditAction.LOGOUT, meta, userId, { sessionId });
  }

  async logoutAll(userId: string, meta: RequestMeta) {
    await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(AuditAction.LOGOUT_ALL, meta, userId);
  }

  async requestOtp(phone: string, purpose: OtpPurpose, meta: RequestMeta) {
    const user = await prisma.user.findUnique({ where: { phone } });
    const otp = generateOtp();
    await prisma.otpCode.create({
      data: {
        phone,
        userId: user?.id,
        purpose,
        codeHash: hashOtp(otp),
        expiresAt: addMinutes(env.OTP_TTL_MINUTES),
      },
    });
    await audit(AuditAction.PHONE_OTP_SENT, meta, user?.id, { purpose });
    logger.info({ phone, otp: isProduction ? undefined : otp }, "OTP generated");
    return { sent: true, devOtp: isProduction ? undefined : otp };
  }

  async verifyOtp(input: VerifyOtpInput, meta: RequestMeta) {
    const code = await prisma.otpCode.findFirst({
      where: {
        phone: input.phone,
        purpose: input.purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (!code || code.codeHash !== hashOtp(input.otp)) {
      if (code) await prisma.otpCode.update({ where: { id: code.id }, data: { attempts: { increment: 1 } } });
      throw new AppError(400, "Invalid or expired OTP", "INVALID_OTP");
    }

    await prisma.otpCode.update({ where: { id: code.id }, data: { consumedAt: new Date() } });

    const user =
      code.user ??
      (await prisma.user.create({
        data: {
          phone: input.phone,
          phoneVerified: true,
          roles: { create: { roleId: (await ensureRole(Roles.User)).id } },
        },
        include: { roles: { include: { role: true } } },
      }));

    await prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } });
    await registerAccountProvider(user.id, "PHONE", input.phone);
    await audit(AuditAction.PHONE_VERIFIED, meta, user.id, { purpose: input.purpose });

    const roles = user.roles.map((userRole) => userRole.role.name);
    const tokens = await createTokens(user.id, roles, meta, input.deviceName);
    return { user: normalizeUser(user), ...tokens };
  }

  async requestEmailVerification(email: string, meta: RequestMeta) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { sent: true };

    const token = signEmailToken(user.id);
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        type: VerificationTokenType.EMAIL_VERIFICATION,
        expiresAt: addMinutes(30),
      },
    });
    await audit(AuditAction.EMAIL_VERIFICATION_SENT, meta, user.id);
    logger.info({ email, token: isProduction ? undefined : token }, "Email verification token generated");
    return { sent: true, devToken: isProduction ? undefined : token };
  }

  async verifyEmail(token: string, meta: RequestMeta) {
    const stored = await prisma.verificationToken.findFirst({
      where: {
        tokenHash: sha256(token),
        type: VerificationTokenType.EMAIL_VERIFICATION,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) throw new AppError(400, "Invalid or expired verification token", "INVALID_TOKEN");

    await prisma.$transaction([
      prisma.user.update({ where: { id: stored.userId }, data: { emailVerified: true } }),
      prisma.verificationToken.update({ where: { id: stored.id }, data: { consumedAt: new Date() } }),
      prisma.auditLog.create({ data: { userId: stored.userId, action: AuditAction.EMAIL_VERIFIED, ipAddress: meta.ipAddress, userAgent: meta.userAgent } }),
    ]);
    return { verified: true };
  }

  async forgotPassword(email: string, meta: RequestMeta) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { sent: true };

    const token = signPasswordResetToken(user.id);
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        type: VerificationTokenType.PASSWORD_RESET,
        expiresAt: addMinutes(15),
      },
    });
    await audit(AuditAction.PASSWORD_RESET_REQUESTED, meta, user.id);
    logger.info({ email, token: isProduction ? undefined : token }, "Password reset token generated");
    return { sent: true, devToken: isProduction ? undefined : token };
  }

  async resetPassword(token: string, password: string, meta: RequestMeta) {
    const stored = await prisma.verificationToken.findFirst({
      where: {
        tokenHash: sha256(token),
        type: VerificationTokenType.PASSWORD_RESET,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!stored) throw new AppError(400, "Invalid or expired reset token", "INVALID_TOKEN");

    await prisma.$transaction([
      prisma.user.update({ where: { id: stored.userId }, data: { passwordHash: await hashPassword(password), failedLoginAttempts: 0, lockedUntil: null, status: "ACTIVE" } }),
      prisma.verificationToken.update({ where: { id: stored.id }, data: { consumedAt: new Date() } }),
      prisma.refreshToken.updateMany({ where: { userId: stored.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.session.updateMany({ where: { userId: stored.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      prisma.auditLog.create({ data: { userId: stored.userId, action: AuditAction.PASSWORD_RESET_COMPLETED, ipAddress: meta.ipAddress, userAgent: meta.userAgent } }),
    ]);
    return { reset: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, meta: RequestMeta) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new AppError(401, "Current password is incorrect", "INVALID_CREDENTIALS");
    }
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
    await audit(AuditAction.PASSWORD_CHANGED, meta, userId);
    return { changed: true };
  }
}

export const authService = new AuthService();
