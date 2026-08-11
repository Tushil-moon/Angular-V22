import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { clearDefaultStoreCache, getDefaultStoreId } from "../../shared/utils/store";
import type { UpdateStoreSettingsInput } from "./settings.validation";

const storeSelect = {
  id: true,
  name: true,
  slug: true,
  code: true,
  status: true,
  timezone: true,
  currencyCode: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
  settings: {
    select: {
      id: true,
      legalName: true,
      supportEmail: true,
      supportPhone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      countryCode: true,
      weightUnit: true,
      dimensionUnit: true,
      taxInclusivePricing: true,
      lowStockThreshold: true,
      orderNumberPrefix: true,
      allowGuestCheckout: true,
      inventoryTracking: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

export const settingsService = {
  async getStore() {
    const storeId = await getDefaultStoreId();
    const store = await prisma.store.findFirst({
      where: { id: storeId, deletedAt: null },
      select: storeSelect,
    });
    if (!store) throw new AppError(404, "Store not found", "STORE_NOT_FOUND");
    return store;
  },

  async updateStore(input: UpdateStoreSettingsInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.store.findFirst({
      where: { id: storeId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new AppError(404, "Store not found", "STORE_NOT_FOUND");

    const storeFields = {
      name: input.name,
      timezone: input.timezone,
      currencyCode: input.currencyCode,
      locale: input.locale,
      status: input.status,
    };

    const settingsFields = {
      legalName: input.legalName,
      supportEmail: input.supportEmail,
      supportPhone: input.supportPhone,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      countryCode: input.countryCode,
      weightUnit: input.weightUnit,
      dimensionUnit: input.dimensionUnit,
      taxInclusivePricing: input.taxInclusivePricing,
      lowStockThreshold: input.lowStockThreshold,
      orderNumberPrefix: input.orderNumberPrefix,
      allowGuestCheckout: input.allowGuestCheckout,
      inventoryTracking: input.inventoryTracking,
    };

    const result = await prisma.$transaction(async (tx) => {
      const hasStoreUpdate = Object.values(storeFields).some((v) => v !== undefined);
      if (hasStoreUpdate) {
        await tx.store.update({
          where: { id: storeId },
          data: storeFields,
        });
        if (input.status) clearDefaultStoreCache();
      }

      const hasSettingsUpdate = Object.values(settingsFields).some((v) => v !== undefined);
      if (hasSettingsUpdate) {
        await tx.storeSettings.upsert({
          where: { storeId },
          create: {
            storeId,
            ...Object.fromEntries(
              Object.entries(settingsFields).filter(([, v]) => v !== undefined),
            ),
          },
          update: settingsFields,
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "SETTINGS_UPDATED",
          resource: "store",
          resourceId: storeId,
          metadata: { changes: Object.keys(input) },
        },
      });

      return tx.store.findFirst({
        where: { id: storeId },
        select: storeSelect,
      });
    });

    return result;
  },
};
