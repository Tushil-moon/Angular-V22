import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { ALL_PERMISSIONS, Permissions } from "../shared/constants/permissions";
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

const PERMISSION_DEFINITIONS = ALL_PERMISSIONS.map((code) => {
  const [action, subject] = code.split(":");
  return { action, subject };
});

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [Roles.SuperAdmin]: [Permissions.ManageAll],
  [Roles.Admin]: ALL_PERMISSIONS.filter((p) => p !== Permissions.ManageAll),
  [Roles.Manager]: [
    Permissions.ReadUsers,
    Permissions.ReadRoles,
    Permissions.ReadSessions,
    Permissions.ReadProducts,
    Permissions.ReadCategories,
    Permissions.ReadBrands,
    Permissions.ReadInventory,
    Permissions.ReadOrders,
    Permissions.ReadCustomers,
    Permissions.ReadAnalytics,
    Permissions.ReadReports,
  ],
  [Roles.ProductManager]: [
    Permissions.ReadProducts,
    Permissions.ManageProducts,
    Permissions.ReadCategories,
    Permissions.ManageCategories,
    Permissions.ReadBrands,
    Permissions.ManageBrands,
    Permissions.ReadCollections,
    Permissions.ManageCollections,
    Permissions.ReadMedia,
    Permissions.ManageMedia,
    Permissions.ReadTags,
    Permissions.ManageTags,
  ],
  [Roles.InventoryManager]: [
    Permissions.ReadInventory,
    Permissions.ManageInventory,
    Permissions.ReadWarehouses,
    Permissions.ManageWarehouses,
    Permissions.ReadSuppliers,
    Permissions.ManageSuppliers,
    Permissions.ReadPurchaseOrders,
    Permissions.ManagePurchaseOrders,
    Permissions.ReadProducts,
  ],
  [Roles.OrderManager]: [
    Permissions.ReadOrders,
    Permissions.ManageOrders,
    Permissions.CancelOrders,
    Permissions.ReadCustomers,
    Permissions.ReadPayments,
    Permissions.ReadShipping,
    Permissions.ManageShipping,
    Permissions.ReadRefunds,
    Permissions.ManageRefunds,
  ],
  [Roles.MarketingManager]: [
    Permissions.ReadPromotions,
    Permissions.ManagePromotions,
    Permissions.ReadCoupons,
    Permissions.ManageCoupons,
    Permissions.ReadGiftCards,
    Permissions.ManageGiftCards,
    Permissions.ReadCms,
    Permissions.ManageCms,
    Permissions.ReadMedia,
    Permissions.ManageMedia,
  ],
  [Roles.CustomerSupport]: [
    Permissions.ReadCustomers,
    Permissions.ManageCustomers,
    Permissions.ReadOrders,
    Permissions.ReadReviews,
    Permissions.ManageReviews,
    Permissions.ReadNotifications,
  ],
  [Roles.Accountant]: [
    Permissions.ReadOrders,
    Permissions.ReadPayments,
    Permissions.ReadRefunds,
    Permissions.ReadReports,
    Permissions.ManageReports,
    Permissions.ReadAnalytics,
  ],
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
          firstName: existing.firstName ?? "Admin",
          lastName: existing.lastName ?? "User",
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
    return existing.id;
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        emailVerified: true,
        status: "ACTIVE",
        firstName: "Admin",
        lastName: "User",
        roles: { create: { roleId: adminRole.id } },
      },
    });

    await tx.account.create({
      data: {
        userId: created.id,
        provider: "EMAIL",
        providerAccountId: ADMIN_EMAIL,
      },
    });

    return created;
  });

  logger.info({ email: ADMIN_EMAIL }, "Admin account created");
  return user.id;
};

const seedStoreCatalog = async (adminUserId: string) => {
  const store = await prisma.store.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Default Store",
      slug: "default",
      code: "DEFAULT",
      status: "ACTIVE",
      timezone: "UTC",
      currencyCode: "USD",
      settings: {
        create: {
          supportEmail: ADMIN_EMAIL,
          orderNumberPrefix: "ORD",
          lowStockThreshold: 5,
        },
      },
    },
  });

  await prisma.storeUser.upsert({
    where: { storeId_userId: { storeId: store.id, userId: adminUserId } },
    update: { isDefault: true },
    create: { storeId: store.id, userId: adminUserId, isDefault: true },
  });

  const warehouse = await prisma.warehouse.upsert({
    where: { storeId_code: { storeId: store.id, code: "MAIN" } },
    update: {},
    create: {
      storeId: store.id,
      name: "Main Warehouse",
      code: "MAIN",
      isDefault: true,
    },
  });

  const brand = await prisma.brand.upsert({
    where: { storeId_slug: { storeId: store.id, slug: "acme" } },
    update: {},
    create: {
      storeId: store.id,
      name: "Acme",
      slug: "acme",
      description: "Sample brand",
      status: "PUBLISHED",
    },
  });

  const category = await prisma.category.upsert({
    where: { storeId_slug: { storeId: store.id, slug: "apparel" } },
    update: {},
    create: {
      storeId: store.id,
      name: "Apparel",
      slug: "apparel",
      status: "PUBLISHED",
      sortOrder: 1,
    },
  });

  const existingProduct = await prisma.product.findFirst({
    where: { storeId: store.id, slug: "classic-tee" },
  });

  if (!existingProduct) {
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        brandId: brand.id,
        name: "Classic Tee",
        slug: "classic-tee",
        description: "A classic cotton t-shirt",
        type: "VARIABLE",
        status: "PUBLISHED",
        visibility: "VISIBLE",
        publishedAt: new Date(),
        categories: { create: { categoryId: category.id } },
        options: {
          create: {
            name: "Size",
            position: 0,
            values: {
              create: [
                { value: "S", position: 0 },
                { value: "M", position: 1 },
                { value: "L", position: 2 },
              ],
            },
          },
        },
      },
      include: { options: { include: { values: true } } },
    });

    const sizeOption = product.options[0];
    for (const value of sizeOption.values) {
      const variant = await prisma.productVariant.create({
        data: {
          storeId: store.id,
          productId: product.id,
          sku: `TEE-${value.value}`,
          title: `Classic Tee / ${value.value}`,
          price: 29.99,
          compareAtPrice: 39.99,
          costPrice: 12.0,
          status: "PUBLISHED",
          optionValues: { create: { optionValueId: value.id } },
        },
      });

      await prisma.inventoryItem.create({
        data: {
          storeId: store.id,
          warehouseId: warehouse.id,
          variantId: variant.id,
          quantityOnHand: 100,
          quantityReserved: 0,
          quantityAvailable: 100,
        },
      });
    }

    logger.info({ productId: product.id }, "Sample product seeded");
  }

  logger.info({ storeId: store.id, warehouseId: warehouse.id }, "Store catalog seeded");
};

const main = async () => {
  for (const role of Object.values(Roles)) {
    await ensureRole(role);
  }

  const permissionRecords = await seedPermissions();
  await seedRolePermissions(permissionRecords);
  const adminUserId = await seedAdminUser();
  await seedStoreCatalog(adminUserId);

  logger.info("E-commerce seed completed");
};

main()
  .catch((error) => {
    logger.error({ err: error }, "Seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
