import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { Permissions } from "../shared/constants/permissions";
import { Roles } from "../shared/constants/roles";
import { hashPassword } from "../shared/utils/crypto";
import { formatPermissionCode } from "../shared/utils/permission";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    "ADMIN_PASSWORD is required. Set it in .env before running the seed script (see .env.example).",
  );
}

const PERMISSION_DEFINITIONS = [
  { action: "manage", subject: "all" },
  { action: "read", subject: "users" },
  { action: "manage", subject: "users" },
  { action: "read", subject: "roles" },
  { action: "manage", subject: "roles" },
  { action: "read", subject: "sessions" },
  { action: "manage", subject: "sessions" },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [Roles.SuperAdmin]: PERMISSION_DEFINITIONS.map(({ action, subject }) =>
    formatPermissionCode(action, subject),
  ),
  [Roles.Admin]: PERMISSION_DEFINITIONS.map(({ action, subject }) =>
    formatPermissionCode(action, subject),
  ),
  [Roles.Manager]: [Permissions.ReadUsers, Permissions.ReadRoles, Permissions.ReadSessions],
  [Roles.User]: [Permissions.ReadSessions],
};

const ensureRole = async (name: string) =>
  prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, description: `${name} role` },
  });

const seedPermissions = async () => {
  const permissionRecords = new Map<string, string>();

  for (const { action, subject } of PERMISSION_DEFINITIONS) {
    const permission = await prisma.permission.upsert({
      where: { action_subject: { action, subject } },
      update: {},
      create: { action, subject },
    });
    permissionRecords.set(formatPermissionCode(action, subject), permission.id);
  }

  return permissionRecords;
};

const seedRolePermissions = async (permissionRecords: Map<string, string>) => {
  for (const [roleName, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await ensureRole(roleName);

    for (const code of permissionCodes) {
      const permissionId = permissionRecords.get(code);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
};

const seedAdminUser = async () => {
  const adminRole = await ensureRole(Roles.SuperAdmin);
  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    include: { roles: true },
  });

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          emailVerified: true,
          status: "ACTIVE",
          deletedAt: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      const hasAdminRole = existing.roles.some((r) => r.roleId === adminRole.id);
      if (!hasAdminRole) {
        await tx.userRole.create({
          data: { userId: existing.id, roleId: adminRole.id },
        });
      }

      await tx.account.upsert({
        where: {
          provider_providerAccountId: { provider: "EMAIL", providerAccountId: ADMIN_EMAIL },
        },
        update: { userId: existing.id },
        create: {
          userId: existing.id,
          provider: "EMAIL",
          providerAccountId: ADMIN_EMAIL,
        },
      });
    });

    logger.info({ email: ADMIN_EMAIL }, "Admin account updated");
    return;
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        emailVerified: true,
        status: "ACTIVE",
        roles: { create: { roleId: adminRole.id } },
      },
    });

    await tx.account.create({
      data: {
        userId: user.id,
        provider: "EMAIL",
        providerAccountId: ADMIN_EMAIL,
      },
    });
  });

  logger.info({ email: ADMIN_EMAIL }, "Admin account created");
};

const main = async () => {
  for (const role of Object.values(Roles)) {
    await ensureRole(role);
  }

  const permissionRecords = await seedPermissions();
  await seedRolePermissions(permissionRecords);
  await seedAdminUser();

  logger.info(
    {
      email: ADMIN_EMAIL,
      role: Roles.SuperAdmin,
    },
    "Seed complete — sign in with ADMIN_EMAIL / ADMIN_PASSWORD from your environment",
  );
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    logger.error({ err: error }, "Seed failed");
    await prisma.$disconnect();
    process.exit(1);
  });
