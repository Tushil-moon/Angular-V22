import type { NextFunction, Request, Response } from "express";

import { Permissions } from "../shared/constants/permissions";
import { AppError } from "../shared/errors/app-error";
import { hasAnyPermission } from "../shared/utils/permission";

const isStoreAdmin = (req: Request): boolean =>
  req.user?.organizationRole === "OWNER" || req.user?.organizationRole === "ADMIN";

export const requireOrgStructureManage = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user?.organizationId) {
    return next(new AppError(403, "Store context required", "FORBIDDEN"));
  }

  if (isStoreAdmin(req)) return next();

  const permissions = req.user.permissions ?? [];
  if (hasAnyPermission(permissions, [Permissions.ManageSettings, Permissions.ManageAll])) {
    return next();
  }

  return next(new AppError(403, "Store admin access required", "FORBIDDEN"));
};
