import { prisma } from "../../config/prisma";
import { formatPermissionCode } from "../../shared/utils/permission";

export const permissionService = {
  async listPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ subject: "asc" }, { action: "asc" }],
      select: {
        id: true,
        action: true,
        subject: true,
        description: true,
        createdAt: true,
      },
    });

    return permissions.map((permission) => ({
      id: permission.id,
      action: permission.action,
      subject: permission.subject,
      code: formatPermissionCode(permission.action, permission.subject),
      description: permission.description,
      createdAt: permission.createdAt,
    }));
  },
};
