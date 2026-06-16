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

const seedCrmData = async () => {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) return;

  const existingContacts = await prisma.contact.count({ where: { deletedAt: null } });
  if (existingContacts > 0) {
    logger.info("CRM sample data already present — skipping");
    return;
  }

  const contacts = await prisma.$transaction(async (tx) => {
    const alice = await tx.contact.create({
      data: {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice.johnson@acme.io",
        phone: "+1 555-0101",
        company: "Acme Corp",
        jobTitle: "VP Sales",
        status: "PROSPECT",
        ownerId: admin.id,
        notes: "Met at SaaS conference. Interested in enterprise plan.",
      },
    });

    const bob = await tx.contact.create({
      data: {
        firstName: "Bob",
        lastName: "Smith",
        email: "bob.smith@techstart.com",
        phone: "+1 555-0102",
        company: "TechStart",
        jobTitle: "CTO",
        status: "LEAD",
        ownerId: admin.id,
      },
    });

    const carol = await tx.contact.create({
      data: {
        firstName: "Carol",
        lastName: "Williams",
        email: "carol@globalretail.com",
        company: "Global Retail",
        jobTitle: "Procurement Lead",
        status: "CUSTOMER",
        ownerId: admin.id,
      },
    });

    const deal1 = await tx.deal.create({
      data: {
        title: "Acme Enterprise License",
        value: 48000,
        stage: "PROPOSAL",
        contactId: alice.id,
        ownerId: admin.id,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: "Annual enterprise subscription for 50 seats.",
      },
    });

    const deal2 = await tx.deal.create({
      data: {
        title: "TechStart Pilot",
        value: 12000,
        stage: "QUALIFIED",
        contactId: bob.id,
        ownerId: admin.id,
        expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
    });

    const deal3 = await tx.deal.create({
      data: {
        title: "Global Retail Renewal",
        value: 96000,
        stage: "NEGOTIATION",
        contactId: carol.id,
        ownerId: admin.id,
        expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    await tx.activity.createMany({
      data: [
        {
          type: "CALL",
          subject: "Discovery call",
          body: "Discussed pain points around onboarding and SSO.",
          contactId: alice.id,
          dealId: deal1.id,
          userId: admin.id,
        },
        {
          type: "EMAIL",
          subject: "Sent proposal",
          body: "Shared pricing breakdown and implementation timeline.",
          contactId: alice.id,
          dealId: deal1.id,
          userId: admin.id,
        },
        {
          type: "MEETING",
          subject: "Technical demo",
          contactId: bob.id,
          dealId: deal2.id,
          userId: admin.id,
        },
        {
          type: "NOTE",
          subject: "Renewal discussion",
          body: "Carol requested a 10% loyalty discount.",
          contactId: carol.id,
          dealId: deal3.id,
          userId: admin.id,
        },
      ],
    });

    return { alice, bob, carol, deal1, deal2, deal3 };
  });

  logger.info(
    { contacts: 3, deals: 3, activities: 4 },
    "CRM sample data seeded",
  );
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
    ["manage", "contacts"],
    ["manage", "deals"],
    ["read", "contacts"],
    ["read", "deals"],
  ] as const;

  for (const [action, subject] of permissions) {
    await prisma.permission.upsert({
      where: { action_subject: { action, subject } },
      update: {},
      create: { action, subject },
    });
  }

  await seedAdminUser();
  await seedCrmData();

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
