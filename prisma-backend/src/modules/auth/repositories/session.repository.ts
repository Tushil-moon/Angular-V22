import { prisma } from "../../../config/prisma";

export const sessionRepository = {
  upsertSession(
    userId: string,
    deviceId: string,
    meta: { deviceName?: string; ipAddress?: string; userAgent?: string },
  ) {
    return prisma.session.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      update: {
        revokedAt: null,
        deviceName: meta.deviceName,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        deviceId,
        deviceName: meta.deviceName,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  },

  createRefreshToken(data: {
    userId: string;
    sessionId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { include: { roles: { include: { role: true } } } },
        session: true,
      },
    });
  },

  rotateRefreshToken(
    previousId: string,
    next: { userId: string; sessionId: string; tokenHash: string; expiresAt: Date },
  ) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({ data: next });
      await tx.refreshToken.update({
        where: { id: previousId },
        data: { revokedAt: new Date(), replacedByTokenId: created.id },
      });
      return created;
    });
  },

  revokeSession(sessionId: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  },

  revokeSessionTokens(userId: string, sessionId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  revokeAllSessions(userId: string) {
    return prisma.$transaction([
      prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  },
};
