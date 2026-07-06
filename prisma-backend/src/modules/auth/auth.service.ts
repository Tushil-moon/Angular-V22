import type { AuditAction } from "@prisma/client";

import { env, isProduction } from "../../config/env";
import { logger } from "../../config/logger";
import { prisma } from "../../config/prisma";
import { emailService } from "../../emails/email.service";
import { Roles } from "../../shared/constants/roles";
import { AppError } from "../../shared/errors/app-error";
import type { RequestMeta } from "../../shared/types/request-meta";
import {
  generateOtp,
  hashOtp,
  hashPassword,
  randomToken,
  sha256,
  verifyPassword,
} from "../../shared/utils/crypto";
import { signAccessToken, signEmailToken, signPasswordResetToken } from "../../shared/utils/jwt";
import { resolveUserAccess } from "../../shared/utils/permission";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_RULES,
} from "../../shared/validation/password-policy";
import { authRepository } from "./repositories/auth.repository";
import { sessionRepository } from "./repositories/session.repository";
import { userSecurityRepository } from "./repositories/user-security.repository";
import { assertPasswordNotReused, archivePasswordHash } from "./utils/password-security";
import type { LoginInput, RegisterInput, VerifyOtpInput } from "./auth.validation";

const VerificationTokenType = {
  EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
  PASSWORD_RESET: "PASSWORD_RESET",
} as const;

type OtpPurpose = "LOGIN" | "PHONE_VERIFICATION";

const addDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
const addMinutes = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000);

const refreshTtlDays = (rememberMe?: boolean) =>
  rememberMe ? env.REMEMBER_ME_TTL_DAYS : env.REFRESH_TOKEN_TTL_DAYS;

const buildAuthProfile = async (
  user: { id: string; roles?: { role: { name: string } }[] } & Record<string, unknown>,
) => {
  const { roles: _roles, ...profile } = user;
  const access = await resolveUserAccess(user.id);
  const twoFactor = await userSecurityRepository.getTwoFactorStatus(user.id);

  return {
    ...profile,
    roles: access.roles,
    permissions: access.permissions,
    twoFactorReady: Boolean(twoFactor?.verifiedAt),
  };
};

const audit = (
  action: AuditAction,
  meta: RequestMeta,
  userId?: string,
  metadata?: Record<string, unknown>,
) =>
  authRepository.createAuditLog({
    action,
    user: userId ? { connect: { id: userId } } : undefined,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: metadata as never,
  });

const recordLoginAttempt = async (
  identifier: string,
  success: boolean,
  meta: RequestMeta,
  userId?: string,
  failureReason?: string,
) => {
  await userSecurityRepository.recordLoginAttempt({
    userId,
    identifier,
    success,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    failureReason,
  });
  await audit("LOGIN_ATTEMPT", meta, userId, { identifier, success, failureReason });
};

const createTokens = async (
  userId: string,
  roles: string[],
  meta: RequestMeta,
  options?: { deviceName?: string; rememberMe?: boolean },
) => {
  const session = await sessionRepository.upsertSession(userId, meta.deviceId, {
    deviceName: options?.deviceName,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const refreshToken = randomToken();
  await sessionRepository.createRefreshToken({
    userId,
    sessionId: session.id,
    tokenHash: sha256(refreshToken),
    expiresAt: addDays(refreshTtlDays(options?.rememberMe)),
  });

  return {
    accessToken: signAccessToken({ sub: userId, sessionId: session.id, roles }),
    refreshToken,
    sessionId: session.id,
  };
};

const updatePassword = async (
  userId: string,
  currentHash: string | null | undefined,
  newPassword: string,
  options?: { clearMustChange?: boolean; revokeSessions?: boolean },
) => {
  await assertPasswordNotReused(userId, newPassword, currentHash);
  const passwordHash = await hashPassword(newPassword);

  if (currentHash) {
    await archivePasswordHash(userId, currentHash);
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: "ACTIVE",
        ...(options?.clearMustChange ? { mustChangePassword: false } : {}),
      },
    });

    if (options?.revokeSessions) {
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  });
};

export class AuthService {
  getSecurityPolicy() {
    return {
      minLength: PASSWORD_MIN_LENGTH,
      rules: PASSWORD_POLICY_RULES,
      historyCount: env.PASSWORD_HISTORY_COUNT,
      maxLoginAttempts: env.MAX_LOGIN_ATTEMPTS,
      lockoutMinutes: env.LOCKOUT_MINUTES,
    };
  }

  async getSecurityStatus(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");

    const twoFactor = await userSecurityRepository.getTwoFactorStatus(userId);

    return {
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      mustChangePassword: user.mustChangePassword,
      passwordChangedAt: user.passwordChangedAt,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorReady: Boolean(twoFactor?.verifiedAt),
    };
  }

  async register(input: RegisterInput, meta: RequestMeta) {
    const passwordHash = await hashPassword(input.password);
    const userRole = await authRepository.upsertRole(Roles.User);

    const existing = await authRepository.findByEmailOrPhone(input.email, input.phone);
    if (existing) throw new AppError(409, "User already exists", "USER_EXISTS");

    const user = await authRepository.createUser({
      email: input.email?.toLowerCase(),
      phone: input.phone,
      passwordHash,
      passwordChangedAt: new Date(),
      roles: { create: { roleId: userRole.id } },
    });

    if (input.email) await authRepository.upsertAccount(user.id, "EMAIL", input.email.toLowerCase());
    if (input.phone) await authRepository.upsertAccount(user.id, "PHONE", input.phone);

    const orgName = input.email
      ? `${input.email.split("@")[0]}'s Workspace`
      : `${input.phone ?? "user"}'s Workspace`;
    await authRepository.createOrganizationForUser(user.id, orgName, `user-${user.id.slice(0, 8)}`);

    await audit("REGISTER", meta, user.id);

    const tokens = await createTokens(user.id, [Roles.User], meta, { deviceName: input.deviceName });
    return { user: await buildAuthProfile(user), ...tokens };
  }

  async login(input: LoginInput, meta: RequestMeta) {
    const identifier = (input.email ?? input.phone ?? "").toLowerCase();
    const user = await authRepository.findByEmailOrPhone(input.email, input.phone);

    if (!user || !user.passwordHash) {
      await recordLoginAttempt(identifier, false, meta, undefined, "INVALID_CREDENTIALS");
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await recordLoginAttempt(identifier, false, meta, user.id, "ACCOUNT_LOCKED");
      throw new AppError(423, "Account is temporarily locked", "ACCOUNT_LOCKED", {
        lockedUntil: user.lockedUntil,
      });
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedLoginAttempts >= env.MAX_LOGIN_ATTEMPTS;
      await authRepository.updateUser(user.id, {
        failedLoginAttempts,
        status: shouldLock ? "LOCKED" : user.status,
        lockedUntil: shouldLock ? addMinutes(env.LOCKOUT_MINUTES) : user.lockedUntil,
      });
      await recordLoginAttempt(identifier, false, meta, user.id, "INVALID_CREDENTIALS");
      await audit(shouldLock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED", meta, user.id);
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const roles = user.roles.map((userRole) => userRole.role.name);
    await authRepository.updateUser(user.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      status: "ACTIVE",
      lastLoginAt: new Date(),
    });

    await recordLoginAttempt(identifier, true, meta, user.id);
    await audit("LOGIN_SUCCESS", meta, user.id);

    const tokens = await createTokens(user.id, roles, meta, {
      deviceName: input.deviceName,
      rememberMe: input.rememberMe,
    });

    return { user: await buildAuthProfile(user), ...tokens };
  }

  async refresh(refreshToken: string, meta: RequestMeta) {
    const tokenHash = sha256(refreshToken);
    const stored = await sessionRepository.findRefreshTokenByHash(tokenHash);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.session.revokedAt) {
      throw new AppError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    const roles = stored.user.roles.map((userRole) => userRole.role.name);
    const nextRefreshToken = randomToken();
    await sessionRepository.rotateRefreshToken(stored.id, {
      userId: stored.userId,
      sessionId: stored.sessionId,
      tokenHash: sha256(nextRefreshToken),
      expiresAt: stored.expiresAt,
    });
    await audit("REFRESH_ROTATED", meta, stored.userId, { sessionId: stored.sessionId });

    return {
      accessToken: signAccessToken({ sub: stored.userId, sessionId: stored.sessionId, roles }),
      refreshToken: nextRefreshToken,
    };
  }

  async logout(userId: string, sessionId: string, meta: RequestMeta) {
    await sessionRepository.revokeSession(sessionId);
    await sessionRepository.revokeSessionTokens(userId, sessionId);
    await audit("LOGOUT", meta, userId, { sessionId });
  }

  async logoutAll(userId: string, meta: RequestMeta) {
    await sessionRepository.revokeAllSessions(userId);
    await audit("LOGOUT_ALL", meta, userId);
  }

  async requestOtp(phone: string, purpose: OtpPurpose, meta: RequestMeta) {
    const user = await prisma.user.findUnique({ where: { phone } });
    const otp = generateOtp();
    await authRepository.createOtpCode({
      phone,
      user: user ? { connect: { id: user.id } } : undefined,
      purpose,
      codeHash: hashOtp(otp),
      expiresAt: addMinutes(env.OTP_TTL_MINUTES),
    });
    await audit("PHONE_OTP_SENT", meta, user?.id, { purpose });
    logger.info({ phone, otp: isProduction ? undefined : otp }, "OTP generated");
    return { sent: true, devOtp: isProduction ? undefined : otp };
  }

  async verifyOtp(input: VerifyOtpInput, meta: RequestMeta) {
    const code = await authRepository.findActiveOtp(input.phone, input.purpose);

    if (!code || code.codeHash !== hashOtp(input.otp)) {
      if (code) await authRepository.incrementOtpAttempts(code.id);
      throw new AppError(400, "Invalid or expired OTP", "INVALID_OTP");
    }

    await authRepository.consumeOtp(code.id);

    const user =
      code.user ??
      (await prisma.user.create({
        data: {
          phone: input.phone,
          phoneVerified: true,
          roles: { create: { roleId: (await authRepository.upsertRole(Roles.User)).id } },
        },
        include: { roles: { include: { role: true } } },
      }));

    await authRepository.updateUser(user.id, { phoneVerified: true });
    await authRepository.upsertAccount(user.id, "PHONE", input.phone);
    await audit("PHONE_VERIFIED", meta, user.id, { purpose: input.purpose });

    const roles = user.roles.map((userRole) => userRole.role.name);
    const tokens = await createTokens(user.id, roles, meta, {
      deviceName: input.deviceName,
      rememberMe: input.rememberMe,
    });
    return { user: await buildAuthProfile(user), ...tokens };
  }

  async requestEmailVerification(email: string, meta: RequestMeta) {
    const user = await authRepository.findByEmail(email);
    if (!user) return { sent: true };

    const token = signEmailToken(user.id);
    await authRepository.createVerificationToken({
      user: { connect: { id: user.id } },
      tokenHash: sha256(token),
      type: VerificationTokenType.EMAIL_VERIFICATION,
      expiresAt: addMinutes(30),
    });
    await audit("EMAIL_VERIFICATION_SENT", meta, user.id);
    await emailService.sendVerificationEmail(email, token);
    return { sent: true, devToken: isProduction ? undefined : token };
  }

  async verifyEmail(token: string, meta: RequestMeta) {
    const stored = await authRepository.findVerificationToken(
      sha256(token),
      VerificationTokenType.EMAIL_VERIFICATION,
    );
    if (!stored) throw new AppError(400, "Invalid or expired verification token", "INVALID_TOKEN");

    await prisma.$transaction([
      prisma.user.update({ where: { id: stored.userId }, data: { emailVerified: true } }),
      prisma.verificationToken.update({ where: { id: stored.id }, data: { consumedAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          userId: stored.userId,
          action: "EMAIL_VERIFIED",
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      }),
    ]);
    return { verified: true };
  }

  async forgotPassword(email: string, meta: RequestMeta) {
    const user = await authRepository.findByEmail(email);
    if (!user) return { sent: true };

    const token = signPasswordResetToken(user.id);
    await authRepository.createVerificationToken({
      user: { connect: { id: user.id } },
      tokenHash: sha256(token),
      type: VerificationTokenType.PASSWORD_RESET,
      expiresAt: addMinutes(15),
    });
    await audit("PASSWORD_RESET_REQUESTED", meta, user.id);
    await emailService.sendPasswordResetEmail(email, token);
    return { sent: true, devToken: isProduction ? undefined : token };
  }

  async resetPassword(token: string, password: string, meta: RequestMeta) {
    const stored = await authRepository.findVerificationToken(
      sha256(token),
      VerificationTokenType.PASSWORD_RESET,
    );
    if (!stored) throw new AppError(400, "Invalid or expired reset token", "INVALID_TOKEN");

    const user = await authRepository.findPasswordHash(stored.userId);

    await updatePassword(stored.userId, user?.passwordHash, password, {
      clearMustChange: true,
      revokeSessions: true,
    });

    await prisma.$transaction([
      prisma.verificationToken.update({ where: { id: stored.id }, data: { consumedAt: new Date() } }),
      prisma.auditLog.create({
        data: {
          userId: stored.userId,
          action: "PASSWORD_RESET_COMPLETED",
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      }),
    ]);
    return { reset: true };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    meta: RequestMeta,
  ) {
    const user = await authRepository.findPasswordHash(userId);
    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, currentPassword))) {
      throw new AppError(401, "Current password is incorrect", "INVALID_CREDENTIALS");
    }

    try {
      await updatePassword(userId, user.passwordHash, newPassword, { clearMustChange: true });
    } catch (error) {
      if (error instanceof AppError && error.code === "PASSWORD_REUSED") {
        await audit("PASSWORD_REUSED", meta, userId);
      }
      throw error;
    }

    await audit("PASSWORD_CHANGED", meta, userId);
    return { changed: true };
  }
}

export const authService = new AuthService();
