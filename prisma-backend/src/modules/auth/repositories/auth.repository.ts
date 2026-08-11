import type { Prisma } from "@prisma/client";

import { prisma } from "../../../config/prisma";

export const publicUserSelect = {
  id: true,
  email: true,
  phone: true,
  emailVerified: true,
  phoneVerified: true,
  status: true,
  mustChangePassword: true,
  passwordChangedAt: true,
  twoFactorEnabled: true,
  createdAt: true,
  roles: { include: { role: true } },
} as const satisfies Prisma.UserSelect;

export type PublicUserRecord = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export const authRepository = {
  findByEmailOrPhone(email?: string, phone?: string) {
    return prisma.user.findFirst({
      where: {
        OR: [
          email ? { email: email.toLowerCase() } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean) as { email?: string; phone?: string }[],
        deletedAt: null,
      },
      include: { roles: { include: { role: true } } },
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { roles: { include: { role: true } } },
    });
  },

  findById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
  },

  findPasswordHash(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
  },

  createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      select: publicUserSelect,
    });
  },

  updateUser(userId: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  },

  upsertAccount(userId: string, provider: "EMAIL" | "PHONE", providerAccountId: string) {
    return prisma.account.upsert({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      update: { userId },
      create: { userId, provider, providerAccountId },
    });
  },

  upsertRole(name: string) {
    return prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} role` },
    });
  },

  createStoreForUser(userId: string, name: string, slug: string) {
    return prisma.store.create({
      data: {
        name,
        slug,
        timezone: "UTC",
        currencyCode: "USD",
        users: { create: { userId, isDefault: true } },
      },
    });
  },

  createVerificationToken(data: Prisma.VerificationTokenCreateInput) {
    return prisma.verificationToken.create({ data });
  },

  findVerificationToken(tokenHash: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET") {
    return prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        type,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  createOtpCode(data: Prisma.OtpCodeCreateInput) {
    return prisma.otpCode.create({ data });
  },

  findActiveOtp(phone: string, purpose: "LOGIN" | "PHONE_VERIFICATION") {
    return prisma.otpCode.findFirst({
      where: {
        phone,
        purpose,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });
  },

  consumeOtp(id: string) {
    return prisma.otpCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  },

  incrementOtpAttempts(id: string) {
    return prisma.otpCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
    });
  },

  createAuditLog(data: Prisma.AuditLogCreateInput) {
    return prisma.auditLog.create({ data });
  },
};
