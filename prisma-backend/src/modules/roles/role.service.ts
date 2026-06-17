import { AuditAction } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Roles } from "../../shared/constants/roles";
import { AppError } from "../../shared/errors/app-error";
import { formatPermissionCode } from "../../shared/utils/permission";
import type { RequestMeta } from "../../shared/types/request-meta";
import type {
  AssignRoleInput,
  CreateRoleInput,
  RemoveRoleInput,
  UpdateRolePermissionsInput,
} from "./role.validation";

const mapPermission = (permission: { id: string; action: string; subject: string }) => ({
  id: permission.id,
  action: permission.action,
  subject: permission.subject,
  code: formatPermissionCode(permission.action, permission.subject),
});

export const roleService = {
  async listPermissions() {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ subject: "asc" }, { action: "asc" }],
      select: { id: true, action: true, subject: true, description: true, createdAt: true },
    });

    return permissions.map((permission) => ({
      ...mapPermission(permission),
      description: permission.description,
      createdAt: permission.createdAt,
    }));
  },

  async listRoles() {
    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        permissions: {
          select: {
            permission: {
              select: { id: true, action: true, subject: true },
            },
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: true,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((entry) => mapPermission(entry.permission)),
    }));
  },

  async createRole(input: CreateRoleInput) {
    try {
      return await prisma.role.create({
        data: {
          name: input.name,
          description: input.description,
        },
      });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        throw new AppError(409, "Role already exists", "ROLE_EXISTS");
      }
      throw error;
    }
  },

  async updateRolePermissions(roleId: string, input: UpdateRolePermissionsInput) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");

    if (role.name === Roles.Admin) {
      throw new AppError(400, "Admin role permissions cannot be modified", "INVALID_ROLE");
    }

    const permissions = await prisma.permission.findMany({
      where: { id: { in: input.permissionIds } },
      select: { id: true },
    });

    if (permissions.length !== input.permissionIds.length) {
      throw new AppError(400, "One or more permissions are invalid", "INVALID_PERMISSION");
    }

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({
        data: input.permissionIds.map((permissionId) => ({ roleId, permissionId })),
      }),
    ]);

    return this.listRoles().then((roles) => roles.find((entry) => entry.id === roleId) ?? null);
  },

  async assignRole(input: AssignRoleInput, actorId: string, meta: RequestMeta) {
    const role = await prisma.role.findUnique({ where: { name: input.roleName } });
    if (!role) throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");

    await prisma.$transaction([
      prisma.userRole.upsert({
        where: { userId_roleId: { userId: input.userId, roleId: role.id } },
        update: {},
        create: { userId: input.userId, roleId: role.id },
      }),
      prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: AuditAction.ROLE_ASSIGNED,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          metadata: { roleName: role.name, assignedBy: actorId },
        },
      }),
    ]);
  },

  async removeRole(input: RemoveRoleInput, actorId: string, meta: RequestMeta) {
    if (input.roleName === Roles.User) {
      throw new AppError(400, "Default user role cannot be removed", "INVALID_ROLE");
    }

    const role = await prisma.role.findUnique({ where: { name: input.roleName } });
    if (!role) throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");

    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: input.userId, roleId: role.id } }),
      prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: AuditAction.ROLE_REMOVED,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          metadata: { roleName: role.name, removedBy: actorId },
        },
      }),
    ]);
  },
};
