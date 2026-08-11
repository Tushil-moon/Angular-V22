import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { formatPermissionCode } from "../../shared/utils/permission";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type {
  CreateRoleInput,
  ListRolesQuery,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
} from "./role.validation";

const permissionSelect = {
  id: true,
  action: true,
  subject: true,
  description: true,
} as const;

const roleInclude = {
  permissions: {
    include: {
      permission: { select: permissionSelect },
    },
  },
} as const;

const mapRole = (role: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{
    permission: {
      id: string;
      action: string;
      subject: string;
      description: string | null;
    };
  }>;
}) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
  permissions: role.permissions.map((entry) => ({
    id: entry.permission.id,
    action: entry.permission.action,
    subject: entry.permission.subject,
    code: formatPermissionCode(entry.permission.action, entry.permission.subject),
    description: entry.permission.description,
  })),
});

const assertPermissionsExist = async (permissionIds: string[]) => {
  if (permissionIds.length === 0) return;

  const uniqueIds = [...new Set(permissionIds)];
  const count = await prisma.permission.count({
    where: { id: { in: uniqueIds } },
  });

  if (count !== uniqueIds.length) {
    throw new AppError(400, "One or more permissions were not found", "INVALID_PERMISSIONS");
  }
};

export const roleService = {
  async listRoles(query: ListRolesQuery) {
    const search = query.search?.trim() ?? "";
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const skip = (query.page - 1) * query.pageSize;

    const [roles, total] = await prisma.$transaction([
      prisma.role.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: query.pageSize,
        include: roleInclude,
      }),
      prisma.role.count({ where }),
    ]);

    return {
      data: roles.map(mapRole),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async getRoleById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: roleInclude,
    });

    if (!role) throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");

    return mapRole(role);
  },

  async createRole(input: CreateRoleInput) {
    const name = input.name.trim();
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) throw new AppError(409, "Role already exists", "ROLE_EXISTS");

    const permissionIds = input.permissionIds ?? [];
    await assertPermissionsExist(permissionIds);

    const role = await prisma.role.create({
      data: {
        name,
        description: input.description?.trim() || null,
        permissions: permissionIds.length
          ? {
              create: permissionIds.map((permissionId) => ({ permissionId })),
            }
          : undefined,
      },
      include: roleInclude,
    });

    return mapRole(role);
  },

  async updateRole(id: string, input: UpdateRoleInput) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");

    if (input.name && input.name.trim() !== role.name) {
      const conflict = await prisma.role.findUnique({ where: { name: input.name.trim() } });
      if (conflict) throw new AppError(409, "Role already exists", "ROLE_EXISTS");
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        description:
          input.description === undefined ? undefined : input.description?.trim() || null,
      },
      include: roleInclude,
    });

    return mapRole(updated);
  },

  async deleteRole(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");

    if (role._count.users > 0) {
      throw new AppError(
        409,
        "Cannot delete a role that is assigned to users",
        "ROLE_IN_USE",
      );
    }

    await prisma.role.delete({ where: { id } });
  },

  async updateRolePermissions(id: string, input: UpdateRolePermissionsInput) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");

    const permissionIds = [...new Set(input.permissionIds)];
    await assertPermissionsExist(permissionIds);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        });
      }

      return tx.role.findUniqueOrThrow({
        where: { id },
        include: roleInclude,
      });
    });

    return mapRole(updated);
  },
};
