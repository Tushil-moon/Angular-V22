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
  { action: "read", subject: "sessions" },
  { action: "manage", subject: "sessions" },
  { action: "read", subject: "organizations" },
  { action: "manage", subject: "organizations" },
  { action: "read", subject: "org_units" },
  { action: "manage", subject: "org_units" },
  { action: "read", subject: "contacts" },
  { action: "manage", subject: "contacts" },
  { action: "read", subject: "leads" },
  { action: "manage", subject: "leads" },
  { action: "read", subject: "deals" },
  { action: "manage", subject: "deals" },
  { action: "read", subject: "activities" },
  { action: "manage", subject: "activities" },
  { action: "read", subject: "companies" },
  { action: "manage", subject: "companies" },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [Roles.SuperAdmin]: PERMISSION_DEFINITIONS.map(({ action, subject }) =>
    formatPermissionCode(action, subject),
  ),
  [Roles.Admin]: PERMISSION_DEFINITIONS.map(({ action, subject }) =>
    formatPermissionCode(action, subject),
  ),
  [Roles.Manager]: [
    Permissions.ReadUsers,
    Permissions.ReadRoles,
    Permissions.ReadSessions,
    Permissions.ReadOrganizations,
    Permissions.ReadOrgUnits,
    Permissions.ManageOrgUnits,
    Permissions.ReadContacts,
    Permissions.ManageContacts,
    Permissions.ReadLeads,
    Permissions.ManageLeads,
    Permissions.ReadDeals,
    Permissions.ManageDeals,
    Permissions.ReadActivities,
    Permissions.ManageActivities,
    Permissions.ReadCompanies,
    Permissions.ManageCompanies,
  ],
  [Roles.Sales]: [
    Permissions.ReadSessions,
    Permissions.ReadOrganizations,
    Permissions.ReadOrgUnits,
    Permissions.ReadContacts,
    Permissions.ManageContacts,
    Permissions.ReadLeads,
    Permissions.ManageLeads,
    Permissions.ReadDeals,
    Permissions.ManageDeals,
    Permissions.ReadActivities,
    Permissions.ManageActivities,
    Permissions.ReadCompanies,
    Permissions.ManageCompanies,
  ],
  [Roles.Support]: [
    Permissions.ReadSessions,
    Permissions.ReadContacts,
    Permissions.ReadLeads,
    Permissions.ReadCompanies,
    Permissions.ReadActivities,
    Permissions.ManageActivities,
  ],
  [Roles.Finance]: [
    Permissions.ReadSessions,
    Permissions.ReadDeals,
    Permissions.ReadCompanies,
  ],
  [Roles.Marketing]: [
    Permissions.ReadSessions,
    Permissions.ReadContacts,
    Permissions.ManageContacts,
    Permissions.ReadLeads,
    Permissions.ManageLeads,
    Permissions.ReadCompanies,
    Permissions.ReadActivities,
  ],
  [Roles.User]: [
    Permissions.ReadSessions,
    Permissions.ReadContacts,
    Permissions.ReadLeads,
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

const seedOrgStructure = async (adminUserId: string) => {
  const branch = await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: DEFAULT_ORG_ID,
        code: "HQ",
      },
    },
    update: {},
    create: {
      organizationId: DEFAULT_ORG_ID,
      type: "BRANCH",
      name: "Headquarters",
      code: "HQ",
      description: "Primary corporate branch",
      managerUserId: adminUserId,
      sortOrder: 1,
    },
  });

  const salesDept = await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: DEFAULT_ORG_ID,
        code: "SALES",
      },
    },
    update: {},
    create: {
      organizationId: DEFAULT_ORG_ID,
      parentId: branch.id,
      type: "DEPARTMENT",
      name: "Sales",
      code: "SALES",
      description: "Revenue and pipeline operations",
      managerUserId: adminUserId,
      sortOrder: 1,
    },
  });

  await prisma.orgUnit.upsert({
    where: {
      organizationId_code: {
        organizationId: DEFAULT_ORG_ID,
        code: "SALES-INBOUND",
      },
    },
    update: {},
    create: {
      organizationId: DEFAULT_ORG_ID,
      parentId: salesDept.id,
      type: "TEAM",
      name: "Inbound Sales",
      code: "SALES-INBOUND",
      sortOrder: 1,
    },
  });

  await prisma.organizationMember.update({
    where: {
      organizationId_userId: {
        organizationId: DEFAULT_ORG_ID,
        userId: adminUserId,
      },
    },
    data: {
      jobTitle: "Chief Executive Officer",
      employeeCode: "EMP-001",
    },
  });

  await prisma.orgUnitMember.upsert({
    where: {
      orgUnitId_userId: {
        orgUnitId: branch.id,
        userId: adminUserId,
      },
    },
    update: { isPrimary: true, title: "CEO" },
    create: {
      organizationId: DEFAULT_ORG_ID,
      orgUnitId: branch.id,
      userId: adminUserId,
      isPrimary: true,
      title: "CEO",
    },
  });

  logger.info({ organizationId: DEFAULT_ORG_ID }, "Organization structure seeded");
};

const seedProductsAndQuotes = async (adminId: string) => {
  const productCount = await prisma.product.count({ where: { organizationId: DEFAULT_ORG_ID } });
  if (productCount > 0) return;

  const [deal, contact, company] = await Promise.all([
    prisma.deal.findFirst({
      where: { organizationId: DEFAULT_ORG_ID, title: "Acme Enterprise License" },
    }),
    prisma.contact.findFirst({
      where: { organizationId: DEFAULT_ORG_ID, email: "alice.johnson@acme.io" },
    }),
    prisma.company.findFirst({
      where: { organizationId: DEFAULT_ORG_ID, name: "Acme Corp" },
    }),
  ]);

  const enterpriseLicense = await prisma.product.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      sku: "ENT-LIC-SEAT",
      name: "Enterprise License (per seat)",
      description: "Annual enterprise subscription seat license.",
      unitPrice: 800,
      currency: "USD",
      category: "Subscription",
      status: "ACTIVE",
    },
  });

  const premiumSupport = await prisma.product.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      sku: "SUP-PREM",
      name: "Premium Support",
      description: "24/7 priority support package.",
      unitPrice: 6000,
      currency: "USD",
      category: "Services",
      status: "ACTIVE",
    },
  });

  const onboarding = await prisma.product.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      sku: "SVC-ONBOARD",
      name: "Onboarding Package",
      description: "Dedicated onboarding and training.",
      unitPrice: 5000,
      currency: "USD",
      category: "Services",
      status: "ACTIVE",
    },
  });

  const quoteCount = await prisma.quote.count({ where: { organizationId: DEFAULT_ORG_ID } });
  const quote = await prisma.quote.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      dealId: deal?.id,
      contactId: contact?.id,
      companyId: company?.id,
      ownerId: adminId,
      quoteNumber: `Q-${new Date().getFullYear()}-${String(quoteCount + 1).padStart(4, "0")}`,
      title: "Acme Enterprise Proposal",
      status: "DRAFT",
      subtotal: 51000,
      discountPercent: 0,
      taxPercent: 8,
      total: 55080,
      currency: "USD",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: "Includes 50 seats, premium support, and onboarding.",
      lineItems: {
        create: [
          {
            productId: enterpriseLicense.id,
            sku: enterpriseLicense.sku,
            name: enterpriseLicense.name,
            description: enterpriseLicense.name,
            quantity: 50,
            unitPrice: 800,
            lineTotal: 40000,
            sortOrder: 0,
          },
          {
            productId: premiumSupport.id,
            sku: premiumSupport.sku,
            name: premiumSupport.name,
            description: premiumSupport.name,
            quantity: 1,
            unitPrice: 6000,
            lineTotal: 6000,
            sortOrder: 1,
          },
          {
            productId: onboarding.id,
            sku: onboarding.sku,
            name: onboarding.name,
            description: onboarding.name,
            quantity: 1,
            unitPrice: 5000,
            lineTotal: 5000,
            sortOrder: 2,
          },
        ],
      },
    },
  });

  await prisma.quoteHistory.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      quoteId: quote.id,
      userId: adminId,
      action: "CREATED",
      details: { source: "seed" },
    },
  });

  logger.info({ products: 3, quotes: 1 }, "Products and quotes seeded");
};

const seedSupportData = async (adminId: string) => {
  const slaCount = await prisma.slaPolicy.count({ where: { organizationId: DEFAULT_ORG_ID } });
  if (slaCount > 0) return;

  const standardSla = await prisma.slaPolicy.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      name: "Standard support",
      description: "Default SLA for medium-priority cases.",
      priority: "MEDIUM",
      firstResponseHours: 4,
      resolutionHours: 24,
      active: true,
    },
  });

  await prisma.slaPolicy.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      name: "Urgent support",
      description: "Escalated SLA for urgent customer issues.",
      priority: "URGENT",
      firstResponseHours: 1,
      resolutionHours: 8,
      active: true,
    },
  });

  const queue = await prisma.queue.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      name: "General Support",
      description: "Default inbound support queue.",
      slaPolicyId: standardSla.id,
      isDefault: true,
    },
  });

  const [contact, company] = await Promise.all([
    prisma.contact.findFirst({
      where: { organizationId: DEFAULT_ORG_ID, email: "alice.johnson@acme.io" },
    }),
    prisma.company.findFirst({
      where: { organizationId: DEFAULT_ORG_ID, name: "Acme Corp" },
    }),
  ]);

  await prisma.knowledgeArticle.createMany({
    data: [
      {
        organizationId: DEFAULT_ORG_ID,
        title: "Reset your password",
        slug: "reset-your-password",
        summary: "Steps to reset an account password.",
        body: "Open Settings > Security and choose Reset password. Follow the email link within 15 minutes.",
        category: "Account",
        published: true,
        publishedAt: new Date(),
        authorId: adminId,
      },
      {
        organizationId: DEFAULT_ORG_ID,
        title: "SSO setup guide",
        slug: "sso-setup-guide",
        summary: "Configure SAML SSO for your organization.",
        body: "Add your IdP metadata under Organization > Security. Map email and name attributes, then test with a pilot user group.",
        category: "Security",
        published: true,
        publishedAt: new Date(),
        authorId: adminId,
      },
    ],
  });

  const caseCount = await prisma.case.count({ where: { organizationId: DEFAULT_ORG_ID } });
  const dueBase = new Date();
  const supportCase = await prisma.case.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      caseNumber: `CS-${new Date().getFullYear()}-${String(caseCount + 1).padStart(4, "0")}`,
      subject: "Cannot access SSO dashboard",
      description: "Alice reports SAML login loops after IdP certificate rotation.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      contactId: contact?.id,
      companyId: company?.id,
      assigneeId: adminId,
      queueId: queue.id,
      slaPolicyId: standardSla.id,
      firstResponseDueAt: new Date(dueBase.getTime() + 4 * 60 * 60 * 1000),
      resolutionDueAt: new Date(dueBase.getTime() + 24 * 60 * 60 * 1000),
      firstRespondedAt: new Date(),
      comments: {
        create: {
          userId: adminId,
          body: "Thanks for reaching out — we're reviewing your IdP metadata now.",
          isInternal: false,
        },
      },
    },
  });

  await prisma.caseHistory.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      caseId: supportCase.id,
      userId: adminId,
      action: "CREATED",
      details: { source: "seed" },
    },
  });

  logger.info({ slaPolicies: 2, queues: 1, articles: 2, cases: 1 }, "Support sample data seeded");
};

const seedMarketingData = async (adminId: string) => {
  const templateCount = await prisma.emailTemplate.count({ where: { organizationId: DEFAULT_ORG_ID } });
  if (templateCount > 0) return;

  const welcomeTemplate = await prisma.emailTemplate.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      name: "Welcome email",
      subject: "Welcome to Acme CRM",
      bodyHtml: "<p>Hi {{firstName}}, thanks for joining. We're excited to help you grow.</p>",
      category: "Onboarding",
      previewText: "Your account is ready — here's how to get started.",
      active: true,
    },
  });

  const nurtureTemplate = await prisma.emailTemplate.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      name: "Product nurture",
      subject: "See what's new in Acme CRM",
      bodyHtml: "<p>Discover features that help your team close deals faster.</p>",
      category: "Nurture",
      previewText: "Tips to get more from your CRM workspace.",
      active: true,
    },
  });

  const sequence = await prisma.emailSequence.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      name: "New lead nurture",
      description: "Two-step drip for inbound leads.",
      active: true,
      steps: {
        create: [
          { order: 0, delayDays: 0, templateId: welcomeTemplate.id },
          { order: 1, delayDays: 3, templateId: nurtureTemplate.id },
        ],
      },
    },
  });

  const contacts = await prisma.contact.findMany({
    where: { organizationId: DEFAULT_ORG_ID },
    take: 2,
    orderBy: { createdAt: "asc" },
  });

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      ownerId: adminId,
      emailTemplateId: welcomeTemplate.id,
      name: "Q3 product launch",
      description: "Email blast announcing enterprise features.",
      type: "EMAIL",
      status: "DRAFT",
      budget: 2500,
      members: contacts.length
        ? { create: contacts.map((contact) => ({ contactId: contact.id })) }
        : undefined,
    },
  });

  await prisma.campaignHistory.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      campaignId: campaign.id,
      userId: adminId,
      action: "CREATED",
      details: { source: "seed", sequenceId: sequence.id },
    },
  });

  logger.info(
    { templates: 2, sequences: 1, campaigns: 1, members: contacts.length },
    "Marketing sample data seeded",
  );
};

const seedAutomationData = async (adminId: string) => {
  const workflowCount = await prisma.workflow.count({ where: { organizationId: DEFAULT_ORG_ID } });
  if (workflowCount > 0) return;

  const workflow = await prisma.workflow.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      ownerId: adminId,
      name: "New lead follow-up",
      description: "Assign owner and create a follow-up task when a lead is created.",
      trigger: "lead.created",
      active: true,
      definition: {
        steps: [
          { order: 0, type: "ASSIGN_OWNER", config: { ownerId: adminId } },
          {
            order: 1,
            type: "CREATE_TASK",
            config: { title: "Follow up with new lead", dueInDays: 1 },
          },
        ],
      },
    },
  });

  await prisma.webhook.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      url: "https://example.com/webhooks/crm",
      events: ["lead.created"],
      secret: "demo-webhook-secret-change-me",
      active: true,
    },
  });

  await prisma.workflowRun.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      workflowId: workflow.id,
      triggerEvent: "lead.created",
      status: "COMPLETED",
      context: { source: "seed" },
      startedAt: new Date(),
      completedAt: new Date(),
      steps: {
        create: [
          {
            stepOrder: 0,
            actionType: "ASSIGN_OWNER",
            status: "COMPLETED",
            input: { ownerId: adminId },
            output: { assigned: true },
            startedAt: new Date(),
            completedAt: new Date(),
          },
          {
            stepOrder: 1,
            actionType: "CREATE_TASK",
            status: "COMPLETED",
            input: { title: "Follow up with new lead" },
            output: { activityId: "seed" },
            startedAt: new Date(),
            completedAt: new Date(),
          },
        ],
      },
    },
  });

  await prisma.workflow.update({
    where: { id: workflow.id },
    data: { runCount: 1, lastRunAt: new Date() },
  });

  logger.info({ workflows: 1, webhooks: 1, runs: 1 }, "Automation sample data seeded");
};

const seedAnalyticsData = async (adminId: string) => {
  const reportCount = await prisma.report.count({ where: { organizationId: DEFAULT_ORG_ID } });
  if (reportCount > 0) return;

  const pipelineReport = await prisma.report.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      userId: adminId,
      name: "Pipeline by stage",
      description: "Open deals grouped by pipeline stage.",
      entityType: "deals",
      chartType: "BAR",
      isShared: true,
      config: { groupBy: "stage", limit: 100 },
    },
  });

  await prisma.report.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      userId: adminId,
      name: "Lead funnel",
      description: "Leads grouped by lifecycle stage.",
      entityType: "leads",
      chartType: "PIE",
      isShared: true,
      config: { groupBy: "stage", limit: 100 },
    },
  });

  await prisma.dashboardLayout.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      userId: adminId,
      name: "Executive overview",
      description: "Default analytics dashboard for leadership.",
      isDefault: true,
      isShared: true,
      widgets: [
        { id: "pipeline", type: "chart", title: "Pipeline", reportId: pipelineReport.id, grid: { x: 0, y: 0, w: 2, h: 1 } },
        { id: "leads", type: "kpi", title: "Lead funnel", reportId: pipelineReport.id, grid: { x: 2, y: 0, w: 1, h: 1 } },
      ],
    },
  });

  await prisma.reportRun.create({
    data: {
      organizationId: DEFAULT_ORG_ID,
      reportId: pipelineReport.id,
      status: "COMPLETED",
      rowCount: 4,
      result: {
        columns: [
          { key: "stage", label: "Stage" },
          { key: "count", label: "Count" },
        ],
        rows: [
          { stage: "LEAD", count: 1 },
          { stage: "PROPOSAL", count: 1 },
        ],
      },
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  await prisma.report.update({
    where: { id: pipelineReport.id },
    data: { lastRunAt: new Date() },
  });

  logger.info({ reports: 2, layouts: 1, runs: 1 }, "Analytics sample data seeded");
};

const seedCrmData = async () => {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) return;

  await ensureDefaultOrganization(admin.id);
  await seedOrgStructure(admin.id);

  const existingContacts = await prisma.contact.count({ where: { deletedAt: null } });
  if (existingContacts > 0) {
    await seedProductsAndQuotes(admin.id);
    await seedSupportData(admin.id);
    await seedMarketingData(admin.id);
    await seedAutomationData(admin.id);
    await seedAnalyticsData(admin.id);
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
          status: "COMPLETED",
          subject: "Discovery call",
          body: "Discussed pain points around onboarding and SSO.",
          contactId: alice.id,
          dealId: deal1.id,
          userId: admin.id,
          assigneeId: admin.id,
        },
        {
          organizationId: DEFAULT_ORG_ID,
          type: "EMAIL",
          status: "COMPLETED",
          subject: "Sent proposal",
          body: "Shared pricing breakdown and implementation timeline.",
          contactId: alice.id,
          dealId: deal1.id,
          userId: admin.id,
          assigneeId: admin.id,
        },
        {
          organizationId: DEFAULT_ORG_ID,
          type: "MEETING",
          status: "COMPLETED",
          subject: "Technical demo",
          contactId: bob.id,
          dealId: deal2.id,
          userId: admin.id,
          assigneeId: admin.id,
        },
        {
          organizationId: DEFAULT_ORG_ID,
          type: "NOTE",
          status: "COMPLETED",
          subject: "Renewal discussion",
          body: "Carol requested a 10% loyalty discount.",
          contactId: carol.id,
          dealId: deal3.id,
          userId: admin.id,
          assigneeId: admin.id,
        },
        {
          organizationId: DEFAULT_ORG_ID,
          type: "TASK",
          status: "PENDING",
          priority: "HIGH",
          subject: "Follow up on proposal feedback",
          body: "Check in with Alice after legal review.",
          contactId: alice.id,
          dealId: deal1.id,
          userId: admin.id,
          assigneeId: admin.id,
          dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          reminderAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        {
          organizationId: DEFAULT_ORG_ID,
          type: "TASK",
          status: "PENDING",
          priority: "URGENT",
          subject: "Prepare renewal deck",
          contactId: carol.id,
          dealId: deal3.id,
          userId: admin.id,
          assigneeId: admin.id,
          dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      ],
    });

    const calendarBase = new Date();
    calendarBase.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;

    await tx.calendarEvent.createMany({
      data: [
        {
          organizationId: DEFAULT_ORG_ID,
          userId: admin.id,
          title: "Acme discovery call",
          type: "CALL",
          status: "CONFIRMED",
          description: "Initial requirements review with Alice",
          location: "Zoom",
          startsAt: new Date(calendarBase.getTime() + 2 * dayMs + 10 * 60 * 60 * 1000),
          endsAt: new Date(calendarBase.getTime() + 2 * dayMs + 11 * 60 * 60 * 1000),
          contactId: alice.id,
          dealId: deal1.id,
        },
        {
          organizationId: DEFAULT_ORG_ID,
          userId: admin.id,
          title: "Pipeline review",
          type: "MEETING",
          status: "CONFIRMED",
          startsAt: new Date(calendarBase.getTime() + 4 * dayMs + 14 * 60 * 60 * 1000),
          endsAt: new Date(calendarBase.getTime() + 4 * dayMs + 15 * 60 * 60 * 1000),
        },
        {
          organizationId: DEFAULT_ORG_ID,
          userId: admin.id,
          title: "Renewal prep",
          type: "TASK",
          status: "TENTATIVE",
          startsAt: new Date(calendarBase.getTime() + 5 * dayMs + 9 * 60 * 60 * 1000),
          endsAt: new Date(calendarBase.getTime() + 5 * dayMs + 10 * 60 * 60 * 1000),
          contactId: carol.id,
          dealId: deal3.id,
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
        employeeCount: 420,
        annualRevenue: 12500000,
        revenueCurrency: "USD",
        ownerId: admin.id,
        locations: {
          create: {
            line1: "100 Market Street",
            city: "San Francisco",
            state: "CA",
            country: "USA",
            isPrimary: true,
            isHeadquarters: true,
          },
        },
      },
    });

    await tx.company.create({
      data: {
        organizationId: DEFAULT_ORG_ID,
        name: "Acme Labs",
        domain: "labs.acme.io",
        industry: "Technology",
        size: "11-50",
        employeeCount: 38,
        ownershipPercent: 100,
        parentCompanyId: acmeCompany.id,
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

    const ruleCount = await tx.leadScoreRule.count({ where: { organizationId: DEFAULT_ORG_ID } });
    if (ruleCount === 0) {
      await tx.leadScoreRule.createMany({
        data: [
          {
            organizationId: DEFAULT_ORG_ID,
            name: "Has email",
            field: "email",
            operator: "eq",
            value: "present",
            points: 20,
            active: true,
          },
          {
            organizationId: DEFAULT_ORG_ID,
            name: "Has phone",
            field: "phone",
            operator: "eq",
            value: "present",
            points: 15,
            active: true,
          },
          {
            organizationId: DEFAULT_ORG_ID,
            name: "Referral source",
            field: "lead_source",
            operator: "eq",
            value: "REFERRAL",
            points: 25,
            active: true,
          },
          {
            organizationId: DEFAULT_ORG_ID,
            name: "Website source",
            field: "lead_source",
            operator: "eq",
            value: "WEBSITE",
            points: 10,
            active: true,
          },
          {
            organizationId: DEFAULT_ORG_ID,
            name: "Executive title",
            field: "job_title",
            operator: "contains",
            value: "cto",
            points: 20,
            active: true,
          },
        ],
      });
    }

    const bobLead = await tx.lead.upsert({
      where: { contactId: bob.id },
      update: {
        stage: "CONTACTED",
        score: 55,
        rating: "WARM",
        nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        lastScoredAt: new Date(),
      },
      create: {
        organizationId: DEFAULT_ORG_ID,
        contactId: bob.id,
        stage: "CONTACTED",
        score: 55,
        rating: "WARM",
        nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        lastScoredAt: new Date(),
      },
    });

    const historyCount = await tx.leadHistory.count({ where: { leadId: bobLead.id } });
    if (historyCount === 0) {
      await tx.leadHistory.create({
        data: {
          organizationId: DEFAULT_ORG_ID,
          leadId: bobLead.id,
          userId: admin.id,
          action: "CREATED",
          details: { source: "seed" },
        },
      });
    }

    const productCount = await tx.product.count({ where: { organizationId: DEFAULT_ORG_ID } });
    if (productCount === 0) {
      await seedProductsAndQuotes(admin.id);
    }

    await seedSupportData(admin.id);
    await seedMarketingData(admin.id);
    await seedAutomationData(admin.id);
    await seedAnalyticsData(admin.id);

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
