import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AppError } from "../shared/errors/app-error";

const ORG_HEADER = "x-organization-id";

export const resolveOrganization = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError(401, "Authentication required", "UNAUTHENTICATED"));
    }

    const headerOrgId = req.headers[ORG_HEADER];
    const requestedOrgId = typeof headerOrgId === "string" ? headerOrgId.trim() : undefined;

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: req.user.id },
      include: { organization: { select: { id: true, name: true, slug: true } } },
      orderBy: { joinedAt: "asc" },
    });

    if (memberships.length === 0) {
      throw new AppError(403, "No organization membership found", "NO_ORGANIZATION");
    }

    const membership = requestedOrgId
      ? memberships.find((item) => item.organizationId === requestedOrgId)
      : memberships[0];

    if (!membership) {
      throw new AppError(403, "You are not a member of this organization", "FORBIDDEN");
    }

    req.user.organizationId = membership.organizationId;
    req.user.organizationRole = membership.role;

    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(403, "Organization access denied", "FORBIDDEN"));
  }
};

export const requireOrganizationAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.organizationRole || !["OWNER", "ADMIN"].includes(req.user.organizationRole)) {
    return next(new AppError(403, "Organization admin access required", "FORBIDDEN"));
  }
  next();
};
