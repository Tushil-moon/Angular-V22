import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  AdjustInventoryInput,
  ListInventoryQuery,
  ListMovementsQuery,
} from "./inventory.validation";

const inventorySelect = {
  id: true,
  storeId: true,
  warehouseId: true,
  locationId: true,
  variantId: true,
  quantityOnHand: true,
  quantityReserved: true,
  quantityAvailable: true,
  reorderPoint: true,
  createdAt: true,
  updatedAt: true,
  warehouse: { select: { id: true, name: true, code: true } },
  variant: {
    select: {
      id: true,
      sku: true,
      title: true,
      product: { select: { id: true, name: true, slug: true } },
    },
  },
} satisfies Prisma.InventoryItemSelect;

export const inventoryService = {
  async list(query: ListInventoryQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.InventoryItemWhereInput = {
      storeId,
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.variantId ? { variantId: query.variantId } : {}),
      ...(query.search
        ? {
            OR: [
              { variant: { sku: { contains: query.search, mode: "insensitive" } } },
              { variant: { product: { name: { contains: query.search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.InventoryItemOrderByWithRelationInput> = {
      updated_at: { updatedAt: query.order },
      quantity_on_hand: { quantityOnHand: query.order },
      quantity_available: { quantityAvailable: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "updated_at"] ?? { updatedAt: "desc" },
        select: inventorySelect,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: items,
      ...buildPaginationMeta(total, page, pageSize),
    };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const item = await prisma.inventoryItem.findFirst({
      where: { id, storeId },
      select: inventorySelect,
    });
    if (!item) throw new AppError(404, "Inventory item not found", "INVENTORY_NOT_FOUND");
    return item;
  },

  async adjust(input: AdjustInventoryInput, actorId?: string) {
    const storeId = await getDefaultStoreId();

    const warehouse = await prisma.warehouse.findFirst({
      where: { id: input.warehouseId, storeId, deletedAt: null },
    });
    if (!warehouse) throw new AppError(404, "Warehouse not found", "WAREHOUSE_NOT_FOUND");

    const variant = await prisma.productVariant.findFirst({
      where: { id: input.variantId, storeId, deletedAt: null },
    });
    if (!variant) throw new AppError(404, "Variant not found", "VARIANT_NOT_FOUND");

    return prisma.$transaction(async (tx) => {
      let item = await tx.inventoryItem.findUnique({
        where: {
          warehouseId_variantId: {
            warehouseId: input.warehouseId,
            variantId: input.variantId,
          },
        },
      });

      if (!item) {
        item = await tx.inventoryItem.create({
          data: {
            storeId,
            warehouseId: input.warehouseId,
            variantId: input.variantId,
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityAvailable: 0,
          },
        });
      }

      const quantityBefore = item.quantityOnHand;
      const quantityAfter = quantityBefore + input.quantityDelta;
      if (quantityAfter < 0) {
        throw new AppError(400, "Insufficient on-hand quantity", "INSUFFICIENT_STOCK");
      }

      const quantityAvailable = Math.max(0, quantityAfter - item.quantityReserved);

      const updated = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          quantityOnHand: quantityAfter,
          quantityAvailable,
        },
        select: inventorySelect,
      });

      await tx.inventoryMovement.create({
        data: {
          storeId,
          inventoryItemId: item.id,
          warehouseId: input.warehouseId,
          variantId: input.variantId,
          type: "ADJUSTMENT",
          quantity: input.quantityDelta,
          quantityBefore,
          quantityAfter,
          note: input.note,
          createdById: actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "INVENTORY_ADJUSTED",
          resource: "inventory_item",
          resourceId: item.id,
          metadata: {
            warehouseId: input.warehouseId,
            variantId: input.variantId,
            quantityDelta: input.quantityDelta,
          },
        },
      });

      return updated;
    });
  },

  async lowStock(query: ListInventoryQuery) {
    const storeId = await getDefaultStoreId();
    const settings = await prisma.storeSettings.findUnique({
      where: { storeId },
      select: { lowStockThreshold: true },
    });
    const threshold = settings?.lowStockThreshold ?? 5;
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.InventoryItemWhereInput = {
      storeId,
      quantityAvailable: { gt: 0, lte: threshold },
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { quantityAvailable: "asc" },
        select: inventorySelect,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: items,
      threshold,
      ...buildPaginationMeta(total, page, pageSize),
    };
  },

  async outOfStock(query: ListInventoryQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.InventoryItemWhereInput = {
      storeId,
      quantityAvailable: { lte: 0 },
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
        select: inventorySelect,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return {
      data: items,
      ...buildPaginationMeta(total, page, pageSize),
    };
  },

  async listMovements(query: ListMovementsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.InventoryMovementWhereInput = {
      storeId,
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.variantId ? { variantId: query.variantId } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.inventoryMovement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          storeId: true,
          inventoryItemId: true,
          warehouseId: true,
          variantId: true,
          type: true,
          quantity: true,
          quantityBefore: true,
          quantityAfter: true,
          referenceType: true,
          referenceId: true,
          note: true,
          createdById: true,
          createdAt: true,
          warehouse: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data: items,
      ...buildPaginationMeta(total, page, pageSize),
    };
  },
};
