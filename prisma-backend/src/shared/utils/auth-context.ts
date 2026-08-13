import type { Request } from "express";
import { AppError } from "../errors/app-error";
import type { AuthContext } from "../types/auth-context";

export const getAuthContext = (req: Request): AuthContext => ({
  userId: req.user!.id,
  roles: req.user!.roles,
  permissions: req.user!.permissions ?? [],
  storeId: req.user!.storeId,
});

export const requireStoreContext = (auth: AuthContext): string => {
  if (!auth.storeId) {
    throw new AppError(400, "Store context is required", "NO_STORE");
  }
  return auth.storeId;
};
