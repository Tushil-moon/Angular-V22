import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";

const sessionSelect = {
  id: true,
  deviceId: true,
  deviceName: true,
  userAgent: true,
  ipAddress: true,
  createdAt: true,
  lastActiveAt: true,
  revokedAt: true,
} as const;

export const sessionService = {
  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { lastActiveAt: "desc" },
      select: sessionSelect,
    });

    return sessions.map((session) => ({
      ...session,
      current: session.id === currentSessionId,
    }));
  },

  async revokeSession(userId: string, sessionId: string) {
    const [sessionsUpdated, tokensUpdated] = await prisma.$transaction([
      prisma.session.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    if (sessionsUpdated.count === 0) {
      throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
    }

    return { sessionsUpdated: sessionsUpdated.count, tokensUpdated: tokensUpdated.count };
  },
};
