import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreateWarehouseInput,
  ListWarehousesQuery,
  UpdateWarehouseInput,
} from "./warehouse.validation";

const warehouseSelect = {
  id: true,
  storeId: true,
  name: true,
  code: true,
  isDefault: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  postalCode: true,
  countryCode: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WarehouseSelect;

export const warehouseService = {
  async list(query: ListWarehousesQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.WarehouseWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.WarehouseOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      name: { name: query.order },
      code: { code: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.warehouse.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "name"] ?? { name: "asc" },
        select: warehouseSelect,
      }),
      prisma.warehouse.count({ where }),
    ]);

    return {
      data: items,
      ...buildPaginationMeta(total, page, pageSize),
    };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const warehouse = await prisma.warehouse.findFirst({
      where: { id, storeId, deletedAt: null },
      select: warehouseSelect,
    });
    if (!warehouse) throw new AppError(404, "Warehouse not found", "WAREHOUSE_NOT_FOUND");
    return warehouse;
  },

  async create(input: CreateWarehouseInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.warehouse.findFirst({
      where: { storeId, code: input.code, deletedAt: null },
    });
    if (existing) throw new AppError(409, "Warehouse code already exists", "WAREHOUSE_CODE_EXISTS");

    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.warehouse.updateMany({
          where: { storeId, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });
      }

      const created = await tx.warehouse.create({
        data: {
          storeId,
          name: input.name,
          code: input.code,
          isDefault: input.isDefault ?? false,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          countryCode: input.countryCode,
        },
        select: warehouseSelect,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "SETTINGS_UPDATED",
          resource: "warehouse",
          resourceId: created.id,
          metadata: { name: created.name, code: created.code },
        },
      });

      return created;
    });
  },

  async update(id: string, input: UpdateWarehouseInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.warehouse.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Warehouse not found", "WAREHOUSE_NOT_FOUND");

    if (input.code && input.code !== existing.code) {
      const codeTaken = await prisma.warehouse.findFirst({
        where: { storeId, code: input.code, deletedAt: null, NOT: { id } },
      });
      if (codeTaken) throw new AppError(409, "Warehouse code already exists", "WAREHOUSE_CODE_EXISTS");
    }

    return prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.warehouse.updateMany({
          where: { storeId, isDefault: true, deletedAt: null, NOT: { id } },
          data: { isDefault: false },
        });
      }

      const updated = await tx.warehouse.update({
        where: { id },
        data: {
          name: input.name,
          code: input.code,
          isDefault: input.isDefault,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          countryCode: input.countryCode,
        },
        select: warehouseSelect,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "SETTINGS_UPDATED",
          resource: "warehouse",
          resourceId: id,
          metadata: { changes: Object.keys(input) },
        },
      });

      return updated;
    });
  },

  async remove(id: string, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.warehouse.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Warehouse not found", "WAREHOUSE_NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      await tx.warehouse.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "SETTINGS_UPDATED",
          resource: "warehouse",
          resourceId: id,
          metadata: { softDeleted: true },
        },
      });
    });
  },
};
