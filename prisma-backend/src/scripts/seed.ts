import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { Roles } from "../shared/constants/roles";
import { hashPassword } from "../shared/utils/crypto";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@123456";

const ensureRole = async (name: string) =>
  prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, description: `${name} role` },
  });

const seedAdminUser = async () => {
  const adminRole = await ensureRole(Roles.Admin);
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

  const permissions = [
    ["manage", "all"],
    ["read", "users"],
    ["manage", "sessions"],
    ["manage", "roles"],
  ] as const;

  for (const [action, subject] of permissions) {
    await prisma.permission.upsert({
      where: { action_subject: { action, subject } },
      update: {},
      create: { action, subject },
    });
  }

  await seedAdminUser();

  logger.info(
    {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: Roles.Admin,
    },
    "Seed complete — use these credentials to sign in",
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
