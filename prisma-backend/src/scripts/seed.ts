import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { Permissions } from "../shared/constants/permissions";
import { Roles } from "../shared/constants/roles";
import { hashPassword } from "../shared/utils/crypto";
import { formatPermissionCode } from "../shared/utils/permission";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@123456";

const PERMISSION_DEFINITIONS = [
  { action: "manage", subject: "all" },
  { action: "read", subject: "users" },
  { action: "manage", subject: "users" },
  { action: "read", subject: "roles" },
  { action: "manage", subject: "roles" },
  { action: "manage", subject: "sessions" },
  { action: "read", subject: "contacts" },
  { action: "manage", subject: "contacts" },
  { action: "read", subject: "deals" },
  { action: "manage", subject: "deals" },
  { action: "read", subject: "activities" },
  { action: "manage", subject: "activities" },
  { action: "read", subject: "companies" },
  { action: "manage", subject: "companies" },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [Roles.Admin]: PERMISSION_DEFINITIONS.map(({ action, subject }) =>
    formatPermissionCode(action, subject),
  ),
  [Roles.Manager]: [
    Permissions.ReadUsers,
    Permissions.ReadRoles,
    Permissions.ReadContacts,
    Permissions.ManageContacts,
    Permissions.ReadDeals,
    Permissions.ManageDeals,
    Permissions.ReadActivities,
    Permissions.ManageActivities,
    Permissions.ReadCompanies,
    Permissions.ManageCompanies,
  ],
  [Roles.User]: [
    Permissions.ReadContacts,
    Permissions.ReadDeals,
    Permissions.ReadActivities,
    Permissions.ManageActivities,
    Permissions.ReadCompanies,
  ],
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

const DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001";

const ensureDefaultOrganization = async (adminUserId: string) => {
  await prisma.organization.upsert({
    where: { id: DEFAULT_ORG_ID },
    update: {},
    create: {
      id: DEFAULT_ORG_ID,
      name: "Default Organization",
      slug: "default",
      timezone: "UTC",
      currency: "USD",
      members: {
        create: {
          userId: adminUserId,
          role: "OWNER",
        },
      },
    },
  });

  const users = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true } });
  for (const user of users) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: DEFAULT_ORG_ID,
          userId: user.id,
        },
      },
      update: {},
      create: {
        organizationId: DEFAULT_ORG_ID,
        userId: user.id,
        role: user.id === adminUserId ? "OWNER" : "MEMBER",
      },
    });
  }
};

const seedCrmData = async () => {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) return;

  await ensureDefaultOrganization(admin.id);

  const existingContacts = await prisma.contact.count({ where: { deletedAt: null } });
  if (existingContacts > 0) {
    logger.info("CRM sample data already present — skipping");
    return;
  }

  const contacts = await prisma.$transaction(async (tx) => {
    const alice = await tx.contact.create({
      data: {
        organizationId: DEFAULT_ORG_ID,
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
        organizationId: DEFAULT_ORG_ID,
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
        organizationId: DEFAULT_ORG_ID,
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
        organizationId: DEFAULT_ORG_ID,
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
        organizationId: DEFAULT_ORG_ID,
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
        organizationId: DEFAULT_ORG_ID,
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
          organizationId: DEFAULT_ORG_ID,
          type: "CALL",
          subject: "Discovery call",
          body: "Discussed pain points around onboarding and SSO.",
          contactId: alice.id,
          dealId: deal1.id,
          userId: admin.id,
        },
        {
          organizationId: DEFAULT_ORG_ID,
          type: "EMAIL",
          subject: "Sent proposal",
          body: "Shared pricing breakdown and implementation timeline.",
          contactId: alice.id,
          dealId: deal1.id,
          userId: admin.id,
        },
        {
          organizationId: DEFAULT_ORG_ID,
          type: "MEETING",
          subject: "Technical demo",
          contactId: bob.id,
          dealId: deal2.id,
          userId: admin.id,
        },
        {
          organizationId: DEFAULT_ORG_ID,
          type: "NOTE",
          subject: "Renewal discussion",
          body: "Carol requested a 10% loyalty discount.",
          contactId: carol.id,
          dealId: deal3.id,
          userId: admin.id,
        },
      ],
    });

    const acmeCompany = await tx.company.create({
      data: {
        organizationId: DEFAULT_ORG_ID,
        name: "Acme Corp",
        domain: "acme.io",
        industry: "Technology",
        size: "201-500",
        website: "https://acme.io",
        ownerId: admin.id,
      },
    });

    await tx.company.create({
      data: {
        organizationId: DEFAULT_ORG_ID,
        name: "TechStart",
        domain: "techstart.com",
        industry: "SaaS",
        size: "11-50",
        ownerId: admin.id,
      },
    });

    await tx.contact.update({
      where: { id: alice.id },
      data: { companyId: acmeCompany.id },
    });

    const enterpriseTag = await tx.tag.create({
      data: { organizationId: DEFAULT_ORG_ID, name: "Enterprise", color: "#6366f1" },
    });
    const hotLeadTag = await tx.tag.create({
      data: { organizationId: DEFAULT_ORG_ID, name: "Hot Lead", color: "#ef4444" },
    });

    await tx.contactTag.createMany({
      data: [
        { contactId: alice.id, tagId: enterpriseTag.id },
        { contactId: bob.id, tagId: hotLeadTag.id },
      ],
    });
    await tx.dealTag.create({
      data: { dealId: deal1.id, tagId: enterpriseTag.id },
    });

    await tx.savedView.createMany({
      data: [
        {
          organizationId: DEFAULT_ORG_ID,
          userId: admin.id,
          entityType: "CONTACTS",
          name: "All prospects",
          filters: { status: "PROSPECT" },
          isDefault: false,
        },
        {
          organizationId: DEFAULT_ORG_ID,
          userId: admin.id,
          entityType: "DEALS",
          name: "Open pipeline",
          filters: { stage: "PROPOSAL" },
          isDefault: true,
        },
      ],
    });

    return { alice, bob, carol, deal1, deal2, deal3 };
  });

  logger.info(
    { contacts: 3, deals: 3, activities: 4, companies: 2, tags: 2, savedViews: 2 },
    "CRM sample data seeded",
  );
};

const main = async () => {
  for (const role of Object.values(Roles)) {
    await ensureRole(role);
  }

  const permissionRecords = await seedPermissions();
  await seedRolePermissions(permissionRecords);

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
