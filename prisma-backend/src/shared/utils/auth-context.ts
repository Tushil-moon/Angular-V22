import type { Request } from "express";
import type { AuthContext } from "../types/auth-context";
import { AppError } from "../errors/app-error";

export const getAuthContext = (req: Request): AuthContext => ({
  userId: req.user!.id,
  roles: req.user!.roles,
  permissions: req.user!.permissions ?? [],
  organizationId: req.user!.organizationId,
  organizationRole: req.user!.organizationRole,
});

export const requireOrganizationContext = (auth: AuthContext): string => {
  if (!auth.organizationId) {
    throw new AppError(400, "Organization context is required", "NO_ORGANIZATION");
  }
  return auth.organizationId;
};
