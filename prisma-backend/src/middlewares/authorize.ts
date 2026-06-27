import type { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/errors/app-error";
import { hasAnyPermission } from "../shared/utils/permission";

export const authorize =
  (...allowedRoles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "Authentication required", "UNAUTHENTICATED"));

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) return next(new AppError(403, "Insufficient permissions", "FORBIDDEN"));

    return next();
  };

export const requirePermission =
  (...requiredPermissions: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "Authentication required", "UNAUTHENTICATED"));

    const permissions = req.user.permissions ?? [];
    if (!hasAnyPermission(permissions, requiredPermissions)) {
      return next(new AppError(403, "Insufficient permissions", "FORBIDDEN"));
    }

    return next();
  };
