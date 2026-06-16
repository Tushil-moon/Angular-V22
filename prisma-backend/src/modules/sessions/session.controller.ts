import { prisma } from "../../config/prisma";
import { asyncHandler } from "../../shared/utils/async-handler";
import { sendSuccess } from "../../shared/utils/response";

export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user!.id },
    orderBy: { lastActiveAt: "desc" },
    select: {
      id: true,
      deviceId: true,
      deviceName: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      lastActiveAt: true,
      revokedAt: true,
    },
  });

  return sendSuccess(res, sessions.map((session) => ({
    ...session,
    current: session.id === req.user!.sessionId,
  })));
});

export const revokeSession = asyncHandler(async (req, res) => {
  const sessionId = String(req.params.id);

  await prisma.session.updateMany({
    where: { id: sessionId, userId: req.user!.id },
    data: { revokedAt: new Date() },
  });
  await prisma.refreshToken.updateMany({
    where: { sessionId, userId: req.user!.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return sendSuccess(res, null, "Session revoked");
});
