import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { AppError } from "../shared/errors/app-error";

const STORE_HEADER = "x-organization-id";

export const resolveOrganization = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError(401, "Authentication required", "UNAUTHENTICATED"));
    }

    const headerStoreId = req.headers[STORE_HEADER];
    const requestedStoreId = typeof headerStoreId === "string" ? headerStoreId.trim() : undefined;

    const memberships = await prisma.storeUser.findMany({
      where: { userId: req.user.id },
      include: { store: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    if (memberships.length === 0) {
      throw new AppError(403, "No store membership found", "NO_STORE");
    }

    const membership = requestedStoreId
      ? memberships.find((item) => item.storeId === requestedStoreId)
      : memberships[0];

    if (!membership) {
      throw new AppError(403, "You are not a member of this store", "FORBIDDEN");
    }

    // organizationId remains the request-scoped tenant id (store) for existing auth context.
    req.user.organizationId = membership.storeId;
    req.user.organizationRole = membership.isDefault ? "OWNER" : "MEMBER";

    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError(403, "Store access denied", "FORBIDDEN"));
  }
};

export const requireOrganizationAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.organizationRole || !["OWNER", "ADMIN"].includes(req.user.organizationRole)) {
    return next(new AppError(403, "Store admin access required", "FORBIDDEN"));
  }
  next();
};
