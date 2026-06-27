import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AppError } from "../shared/errors/app-error";
import { verifyAccessToken } from "../shared/utils/jwt";
import { resolveUserAccess } from "../shared/utils/permission";

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) throw new AppError(401, "Missing access token", "UNAUTHENTICATED");

    const payload = verifyAccessToken(token);
    const session = await prisma.session.findFirst({
      where: { id: payload.sessionId, userId: payload.sub, revokedAt: null },
      include: {
        user: {
          include: { roles: { include: { role: true } } },
        },
      },
    });

    if (!session || session.user.status !== "ACTIVE") {
      throw new AppError(401, "Invalid or expired session", "UNAUTHENTICATED");
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    const access = await resolveUserAccess(session.userId);

    req.user = {
      id: session.userId,
      sessionId: session.id,
      roles: access.roles,
      permissions: access.permissions,
    };

    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(401, "Invalid access token", "UNAUTHENTICATED"));
  }
};
