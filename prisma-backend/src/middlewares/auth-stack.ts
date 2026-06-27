import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { authenticate } from "./authenticate";
import { resolveOrganization } from "./resolve-organization";

export const authenticateWithOrganization = [
  authenticate,
  resolveOrganization,
] as const;

export const loadUserEmailForInvite = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next();
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { email: true },
  });
  (req as Request & { userEmail?: string | null }).userEmail = user?.email;
  next();
};
