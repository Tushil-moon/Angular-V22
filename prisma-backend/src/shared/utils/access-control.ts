import { AppError } from "../errors/app-error";
import type { AuthContext } from "../types/auth-context";
import { Permissions } from "../constants/permissions";
import { Roles } from "../constants/roles";
import { hasPermission, ownerScopeFilter, shouldScopeToOwner } from "./permission";

export const storeScopeFilter = (storeId: string) => ({ storeId });

/** @deprecated Prefer storeScopeFilter — organizationId maps to store id in auth context. */
export const orgScopeFilter = (organizationId: string) => storeScopeFilter(organizationId);

export const buildStoreScopedWhere = <T extends Record<string, unknown>>(auth: AuthContext, where: T) => {
  if (!auth.organizationId) {
    throw new AppError(400, "Store context is required", "NO_STORE");
  }

  return {
    ...where,
    ...storeScopeFilter(auth.organizationId),
  };
};

/** @deprecated Prefer buildStoreScopedWhere */
export const buildOrgScopedWhere = buildStoreScopedWhere;

export const buildOwnerScopedWhere = <T extends Record<string, unknown>>(auth: AuthContext, where: T) => {
  const storeWhere = buildStoreScopedWhere(auth, where);

  if (!shouldScopeToOwner(auth.roles, auth.permissions)) {
    return storeWhere;
  }

  return {
    ...storeWhere,
    ...ownerScopeFilter(auth.userId),
  };
};

export const canManageRecord = (auth: AuthContext, ownerId?: string | null): boolean => {
  if (hasPermission(auth.permissions, Permissions.ManageAll)) return true;
  if (auth.roles.includes(Roles.Admin) || auth.roles.includes(Roles.Manager)) return true;
  if (auth.roles.includes(Roles.SuperAdmin)) return true;
  return ownerId === auth.userId;
};

export const assertRecordOwnerAccess = (
  auth: AuthContext,
  ownerId: string | null | undefined,
  message = "You do not have access to this record",
) => {
  if (!shouldScopeToOwner(auth.roles, auth.permissions)) return;
  if (ownerId !== auth.userId) {
    throw new AppError(403, message, "FORBIDDEN");
  }
};
