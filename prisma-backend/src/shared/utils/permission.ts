import { prisma } from "../../config/prisma";
import { Permissions } from "../constants/permissions";
import { Roles } from "../constants/roles";

export const formatPermissionCode = (action: string, subject: string) => `${action}:${subject}`;

export const hasPermission = (userPermissions: readonly string[], required: string): boolean => {
  if (userPermissions.includes(Permissions.ManageAll)) return true;
  if (userPermissions.includes(required)) return true;

  const [action, subject] = required.split(":");
  if (action === "read" && subject) {
    return userPermissions.includes(formatPermissionCode("manage", subject));
  }

  return false;
};

export const hasAnyPermission = (userPermissions: readonly string[], required: string[]): boolean =>
  required.some((permission) => hasPermission(userPermissions, permission));

export const resolveUserAccess = async (userId: string) => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: { select: { action: true, subject: true } } },
          },
        },
      },
    },
  });

  const roles = userRoles.map((entry) => entry.role.name);
  const permissionSet = new Set<string>();

  for (const entry of userRoles) {
    for (const rolePermission of entry.role.permissions) {
      permissionSet.add(
        formatPermissionCode(rolePermission.permission.action, rolePermission.permission.subject),
      );
    }
  }

  return {
    roles,
    permissions: [...permissionSet],
  };
};

/** Standard users only see records they own; Admin/Manager (or manage:*) see all. */
export const shouldScopeToOwner = (roles: readonly string[], permissions: readonly string[]): boolean => {
  if (hasPermission(permissions, Permissions.ManageAll)) return false;
  if (roles.includes(Roles.Admin) || roles.includes(Roles.Manager)) return false;
  return true;
};

export const ownerScopeFilter = (userId: string) => ({ ownerId: userId });
