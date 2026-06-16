import { AuditAction } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Roles } from "../../shared/constants/roles";
import { AppError } from "../../shared/errors/app-error";
import type { RequestMeta } from "../../shared/types/request-meta";
import type { AssignRoleInput, CreateRoleInput, RemoveRoleInput } from "./role.validation";

export const roleService = {
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
              select: { id: true, action: true, subject: true, code: true },
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
      permissions: role.permissions.map((entry) => entry.permission),
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
