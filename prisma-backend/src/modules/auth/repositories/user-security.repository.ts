import { prisma } from "../../../config/prisma";

export const userSecurityRepository = {
  recordLoginAttempt(data: {
    userId?: string;
    identifier: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    failureReason?: string;
  }) {
    return prisma.loginAttempt.create({ data });
  },

  getRecentPasswordHashes(userId: string, limit: number) {
    return prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { passwordHash: true },
    });
  },

  appendPasswordHistory(userId: string, passwordHash: string) {
    return prisma.passwordHistory.create({
      data: { userId, passwordHash },
    });
  },

  trimPasswordHistory(userId: string, keep: number) {
    return prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: keep,
      select: { id: true },
    }).then((stale) => {
      if (stale.length === 0) return;
      return prisma.passwordHistory.deleteMany({
        where: { id: { in: stale.map((row) => row.id) } },
      });
    });
  },

  getTwoFactorStatus(userId: string) {
    return prisma.twoFactorSecret.findUnique({
      where: { userId },
      select: { verifiedAt: true },
    });
  },
};
