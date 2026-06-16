import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { Roles } from "../shared/constants/roles";

const main = async () => {
  for (const role of Object.values(Roles)) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role, description: `${role} role` },
    });
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
