import { prisma } from "../../config/prisma";
import { Roles } from "../../shared/constants/roles";
import { AppError } from "../../shared/errors/app-error";
import { asyncHandler } from "../../shared/utils/async-handler";
import { sendCreated, sendSuccess } from "../../shared/utils/response";

const AuditAction = {
  ROLE_ASSIGNED: "ROLE_ASSIGNED",
  ROLE_REMOVED: "ROLE_REMOVED",
} as const;

export const listRoles = asyncHandler(async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { permissions: { include: { permission: true } } },
  });

  return sendSuccess(
    res,
    roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: true,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((entry) => entry.permission),
    }))
  );
});

export const createRole = asyncHandler(async (req, res) => {
  const role = await prisma.role.create({
    data: {
      name: req.body.name,
      description: req.body.description,
    },
  });
  return sendCreated(res, role, "Role created");
});

export const assignRole = asyncHandler(async (req, res) => {
  const role = await prisma.role.findUnique({ where: { name: req.body.roleName } });
  if (!role) throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: req.body.userId, roleId: role.id } },
    update: {},
    create: { userId: req.body.userId, roleId: role.id },
  });
  await prisma.auditLog.create({
    data: {
      userId: req.body.userId,
      action: AuditAction.ROLE_ASSIGNED,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { roleName: role.name, assignedBy: req.user!.id },
    },
  });
  return sendSuccess(res, null, "Role assigned");
});

export const removeRole = asyncHandler(async (req, res) => {
  if (req.body.roleName === Roles.User) throw new AppError(400, "Default user role cannot be removed", "INVALID_ROLE");

  const role = await prisma.role.findUnique({ where: { name: req.body.roleName } });
  if (!role) throw new AppError(404, "Role not found", "ROLE_NOT_FOUND");

  await prisma.userRole.deleteMany({ where: { userId: req.body.userId, roleId: role.id } });
  await prisma.auditLog.create({
    data: {
      userId: req.body.userId,
      action: AuditAction.ROLE_REMOVED,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { roleName: role.name, removedBy: req.user!.id },
    },
  });
  return sendSuccess(res, null, "Role removed");
});
