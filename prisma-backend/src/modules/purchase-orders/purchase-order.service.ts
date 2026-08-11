import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  UpdatePurchaseOrderInput,
} from "./purchase-order.validation";

const purchaseOrderSelect = {
  id: true,
  storeId: true,
  warehouseId: true,
  supplierId: true,
  poNumber: true,
  status: true,
  currencyCode: true,
  subtotal: true,
  taxTotal: true,
  shippingTotal: true,
  grandTotal: true,
  orderedAt: true,
  expectedAt: true,
  receivedAt: true,
  note: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PurchaseOrderSelect;

const assertWarehouseExists = async (storeId: string, warehouseId: string) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, storeId, deletedAt: null },
    select: { id: true },
  });
  if (!warehouse) throw new AppError(404, "Warehouse not found", "WAREHOUSE_NOT_FOUND");
};

const assertSupplierExists = async (storeId: string, supplierId: string) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, storeId, deletedAt: null },
    select: { id: true },
  });
  if (!supplier) throw new AppError(404, "Supplier not found", "SUPPLIER_NOT_FOUND");
};

export const purchaseOrderService = {
  async list(query: ListPurchaseOrdersQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PurchaseOrderWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.search ? { poNumber: { contains: query.search, mode: "insensitive" } } : {}),
    };

    const sortMap: Record<string, Prisma.PurchaseOrderOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      po_number: { poNumber: query.order },
      ordered_at: { orderedAt: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: purchaseOrderSelect,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id, storeId, deletedAt: null },
      select: purchaseOrderSelect,
    });
    if (!purchaseOrder) throw new AppError(404, "Purchase order not found", "PURCHASE_ORDER_NOT_FOUND");
    return purchaseOrder;
  },

  async create(input: CreatePurchaseOrderInput) {
    const storeId = await getDefaultStoreId();

    await assertWarehouseExists(storeId, input.warehouseId);
    await assertSupplierExists(storeId, input.supplierId);

    const existing = await prisma.purchaseOrder.findFirst({
      where: { storeId, poNumber: input.poNumber, deletedAt: null },
    });
    if (existing) {
      throw new AppError(409, "Purchase order number already exists", "PURCHASE_ORDER_NUMBER_EXISTS");
    }

    return prisma.purchaseOrder.create({
      data: {
        storeId,
        warehouseId: input.warehouseId,
        supplierId: input.supplierId,
        poNumber: input.poNumber,
        status: input.status ?? "DRAFT",
        currencyCode: input.currencyCode ?? "USD",
        note: input.note ?? null,
        orderedAt: input.orderedAt ?? null,
        expectedAt: input.expectedAt ?? null,
      },
      select: purchaseOrderSelect,
    });
  },

  async update(id: string, input: UpdatePurchaseOrderInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Purchase order not found", "PURCHASE_ORDER_NOT_FOUND");

    if (input.warehouseId && input.warehouseId !== existing.warehouseId) {
      await assertWarehouseExists(storeId, input.warehouseId);
    }
    if (input.supplierId && input.supplierId !== existing.supplierId) {
      await assertSupplierExists(storeId, input.supplierId);
    }

    if (input.poNumber && input.poNumber !== existing.poNumber) {
      const poNumberTaken = await prisma.purchaseOrder.findFirst({
        where: { storeId, poNumber: input.poNumber, deletedAt: null, NOT: { id } },
      });
      if (poNumberTaken) {
        throw new AppError(409, "Purchase order number already exists", "PURCHASE_ORDER_NUMBER_EXISTS");
      }
    }

    let receivedAt = input.receivedAt;
    if (receivedAt === undefined && input.status === "RECEIVED" && !existing.receivedAt) {
      receivedAt = new Date();
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: {
        warehouseId: input.warehouseId,
        supplierId: input.supplierId,
        poNumber: input.poNumber,
        status: input.status,
        currencyCode: input.currencyCode,
        note: input.note === undefined ? undefined : input.note,
        orderedAt: input.orderedAt === undefined ? undefined : input.orderedAt,
        expectedAt: input.expectedAt === undefined ? undefined : input.expectedAt,
        receivedAt: receivedAt === undefined ? undefined : receivedAt,
      },
      select: purchaseOrderSelect,
    });
  },

  async remove(id: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Purchase order not found", "PURCHASE_ORDER_NOT_FOUND");

    await prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date(), status: "CANCELLED" },
    });
  },
};
