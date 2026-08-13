import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { CreateOrderInput, ListOrdersQuery } from "./order.validation";

const orderListSelect = {
  id: true,
  storeId: true,
  customerId: true,
  orderNumber: true,
  status: true,
  fulfillmentStatus: true,
  paymentStatus: true,
  currencyCode: true,
  subtotal: true,
  discountTotal: true,
  taxTotal: true,
  shippingTotal: true,
  grandTotal: true,
  amountRefunded: true,
  customerEmail: true,
  customerPhone: true,
  note: true,
  placedAt: true,
  cancelledAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  items: {
    take: 1,
    orderBy: { createdAt: "asc" },
    select: {
      productName: true,
      variantTitle: true,
      variant: {
        select: {
          product: {
            select: {
              images: {
                take: 1,
                orderBy: { position: "asc" },
                select: { url: true, altText: true },
              },
            },
          },
        },
      },
    },
  },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

const orderDetailSelect = {
  ...orderListSelect,
  items: {
    select: {
      id: true,
      variantId: true,
      productId: true,
      productName: true,
      variantTitle: true,
      sku: true,
      barcode: true,
      quantity: true,
      unitPrice: true,
      compareAtPrice: true,
      discountAmount: true,
      taxAmount: true,
      lineTotal: true,
    },
  },
  addresses: {
    select: {
      id: true,
      type: true,
      firstName: true,
      lastName: true,
      company: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      countryCode: true,
      phone: true,
    },
  },
  statusHistory: {
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      note: true,
      createdById: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.OrderSelect;

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "PACKED", "SHIPPED", "CANCELLED"],
  PROCESSING: ["PACKED", "SHIPPED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "COMPLETED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED", "COMPLETED"],
};

async function findOrderOrThrow(id: string, storeId: string) {
  const order = await prisma.order.findFirst({
    where: { id, storeId, deletedAt: null },
    select: orderDetailSelect,
  });
  if (!order) throw new AppError(404, "Order not found", "ORDER_NOT_FOUND");
  return order;
}

async function transitionStatus(
  id: string,
  toStatus: OrderStatus,
  actorId: string | undefined,
  auditAction: "ORDER_UPDATED" | "ORDER_CANCELLED" | "ORDER_SHIPPED" | "ORDER_COMPLETED" | "ORDER_FULFILLED",
  note?: string,
  extraData?: Prisma.OrderUpdateInput,
) {
  const storeId = await getDefaultStoreId();
  const existing = await prisma.order.findFirst({
    where: { id, storeId, deletedAt: null },
  });
  if (!existing) throw new AppError(404, "Order not found", "ORDER_NOT_FOUND");

  const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
  if (!allowed.includes(toStatus)) {
    throw new AppError(
      400,
      `Cannot transition order from ${existing.status} to ${toStatus}`,
      "INVALID_ORDER_STATUS_TRANSITION",
    );
  }

  return prisma.$transaction(async (tx) => {
    if (toStatus === "CANCELLED") {
      await releaseReservations(tx, storeId, id, actorId);
    }

    if (toStatus === "SHIPPED") {
      await fulfillReservations(tx, storeId, id, actorId);
    }

    const updated = await tx.order.update({
      where: { id },
      data: {
        status: toStatus,
        ...extraData,
        ...(toStatus === "SHIPPED" ? { fulfillmentStatus: "FULFILLED" } : {}),
      },
      select: orderDetailSelect,
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: existing.status,
        toStatus,
        note,
        createdById: actorId,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: auditAction,
        resource: "order",
        resourceId: id,
        metadata: { from: existing.status, to: toStatus },
      },
    });

    return updated;
  });
}

async function releaseReservations(
  tx: Prisma.TransactionClient,
  storeId: string,
  orderId: string,
  actorId?: string,
) {
  const items = await tx.orderItem.findMany({
    where: { orderId, variantId: { not: null } },
    select: { variantId: true, quantity: true },
  });

  const warehouse = await tx.warehouse.findFirst({
    where: { storeId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (!warehouse) return;

  for (const item of items) {
    if (!item.variantId) continue;
    const inv = await tx.inventoryItem.findUnique({
      where: {
        warehouseId_variantId: { warehouseId: warehouse.id, variantId: item.variantId },
      },
    });
    if (!inv || inv.quantityReserved < item.quantity) continue;

    const quantityBefore = inv.quantityOnHand;
    const quantityReserved = inv.quantityReserved - item.quantity;
    const quantityAvailable = inv.quantityOnHand - quantityReserved;

    await tx.inventoryItem.update({
      where: { id: inv.id },
      data: { quantityReserved, quantityAvailable },
    });

    await tx.inventoryMovement.create({
      data: {
        storeId,
        inventoryItemId: inv.id,
        warehouseId: warehouse.id,
        variantId: item.variantId,
        type: "RELEASE",
        quantity: item.quantity,
        quantityBefore,
        quantityAfter: quantityBefore,
        referenceType: "order",
        referenceId: orderId,
        createdById: actorId,
      },
    });
  }
}

async function fulfillReservations(
  tx: Prisma.TransactionClient,
  storeId: string,
  orderId: string,
  actorId?: string,
) {
  const items = await tx.orderItem.findMany({
    where: { orderId, variantId: { not: null } },
    select: { variantId: true, quantity: true },
  });

  const warehouse = await tx.warehouse.findFirst({
    where: { storeId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  if (!warehouse) return;

  for (const item of items) {
    if (!item.variantId) continue;
    const inv = await tx.inventoryItem.findUnique({
      where: {
        warehouseId_variantId: { warehouseId: warehouse.id, variantId: item.variantId },
      },
    });
    if (!inv) continue;

    const reserved = Math.min(inv.quantityReserved, item.quantity);
    const quantityBefore = inv.quantityOnHand;
    const quantityOnHand = Math.max(0, inv.quantityOnHand - item.quantity);
    const quantityReserved = Math.max(0, inv.quantityReserved - reserved);
    const quantityAvailable = Math.max(0, quantityOnHand - quantityReserved);

    await tx.inventoryItem.update({
      where: { id: inv.id },
      data: { quantityOnHand, quantityReserved, quantityAvailable },
    });

    await tx.inventoryMovement.create({
      data: {
        storeId,
        inventoryItemId: inv.id,
        warehouseId: warehouse.id,
        variantId: item.variantId,
        type: "FULFILL",
        quantity: -item.quantity,
        quantityBefore,
        quantityAfter: quantityOnHand,
        referenceType: "order",
        referenceId: orderId,
        createdById: actorId,
      },
    });
  }
}

export const orderService = {
  async list(query: ListOrdersQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrderWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: "insensitive" } },
              { customerEmail: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.OrderOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      grand_total: { grandTotal: query.order },
      placed_at: { placedAt: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: orderListSelect,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: items,
      ...buildPaginationMeta(total, page, pageSize),
    };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    return findOrderOrThrow(id, storeId);
  },

  async create(input: CreateOrderInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const store = await prisma.store.findFirst({
      where: { id: storeId },
      select: { currencyCode: true, settings: { select: { orderNumberPrefix: true } } },
    });

    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, storeId, deletedAt: null },
      });
      if (!customer) throw new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");
    }

    const variantIds = input.items.map((i) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds }, storeId, deletedAt: null },
      select: {
        id: true,
        sku: true,
        title: true,
        barcode: true,
        price: true,
        compareAtPrice: true,
        trackInventory: true,
        productId: true,
        product: { select: { id: true, name: true } },
      },
    });

    if (variants.length !== new Set(variantIds).size) {
      throw new AppError(400, "One or more variants not found", "VARIANT_NOT_FOUND");
    }

    const variantMap = new Map(variants.map((v) => [v.id, v]));
    const lineItems = input.items.map((item) => {
      const variant = variantMap.get(item.variantId)!;
      const unitPrice = Number(variant.price);
      return {
        variantId: variant.id,
        productId: variant.productId,
        productName: variant.product.name,
        variantTitle: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        quantity: item.quantity,
        unitPrice,
        compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
        lineTotal: unitPrice * item.quantity,
        trackInventory: variant.trackInventory,
      };
    });

    const subtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
    const prefix = store?.settings?.orderNumberPrefix ?? "ORD";
    const orderNumber = `${prefix}-${Date.now()}`;

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          storeId,
          customerId: input.customerId,
          orderNumber,
          status: "PENDING",
          currencyCode: store?.currencyCode ?? "USD",
          subtotal,
          grandTotal: subtotal,
          customerEmail: input.email,
          note: input.notes,
          placedAt: new Date(),
          items: {
            create: lineItems.map((line) => ({
              variantId: line.variantId,
              productId: line.productId,
              productName: line.productName,
              variantTitle: line.variantTitle,
              sku: line.sku,
              barcode: line.barcode,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              compareAtPrice: line.compareAtPrice,
              lineTotal: line.lineTotal,
            })),
          },
          statusHistory: {
            create: {
              toStatus: "PENDING",
              note: "Order created",
              createdById: actorId,
            },
          },
          ...(input.shippingAddress
            ? {
                addresses: {
                  create: [
                    {
                      type: "SHIPPING" as const,
                      ...input.shippingAddress,
                    },
                    ...(input.billingAddress
                      ? [
                          {
                            type: "BILLING" as const,
                            ...input.billingAddress,
                          },
                        ]
                      : []),
                  ],
                },
              }
            : input.billingAddress
              ? {
                  addresses: {
                    create: [{ type: "BILLING" as const, ...input.billingAddress }],
                  },
                }
              : {}),
        },
        select: orderDetailSelect,
      });

      const warehouse = await tx.warehouse.findFirst({
        where: { storeId, deletedAt: null },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });

      if (warehouse) {
        for (const line of lineItems) {
          if (!line.trackInventory) continue;

          let inv = await tx.inventoryItem.findUnique({
            where: {
              warehouseId_variantId: {
                warehouseId: warehouse.id,
                variantId: line.variantId,
              },
            },
          });

          if (!inv) {
            inv = await tx.inventoryItem.create({
              data: {
                storeId,
                warehouseId: warehouse.id,
                variantId: line.variantId,
                quantityOnHand: 0,
                quantityReserved: 0,
                quantityAvailable: 0,
              },
            });
          }

          if (inv.quantityAvailable >= line.quantity) {
            const quantityBefore = inv.quantityOnHand;
            const quantityReserved = inv.quantityReserved + line.quantity;
            const quantityAvailable = inv.quantityOnHand - quantityReserved;

            await tx.inventoryItem.update({
              where: { id: inv.id },
              data: { quantityReserved, quantityAvailable },
            });

            await tx.inventoryMovement.create({
              data: {
                storeId,
                inventoryItemId: inv.id,
                warehouseId: warehouse.id,
                variantId: line.variantId,
                type: "RESERVE",
                quantity: line.quantity,
                quantityBefore,
                quantityAfter: quantityBefore,
                referenceType: "order",
                referenceId: order.id,
                createdById: actorId,
              },
            });
          }
        }
      }

      if (input.customerId) {
        await tx.customer.update({
          where: { id: input.customerId },
          data: {
            totalOrders: { increment: 1 },
            lastOrderAt: new Date(),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "ORDER_CREATED",
          resource: "order",
          resourceId: order.id,
          metadata: { orderNumber, grandTotal: subtotal },
        },
      });

      return order;
    });
  },

  async confirm(id: string, actorId?: string) {
    return transitionStatus(id, "CONFIRMED", actorId, "ORDER_UPDATED", "Order confirmed");
  },

  async cancel(id: string, actorId?: string) {
    return transitionStatus(id, "CANCELLED", actorId, "ORDER_CANCELLED", "Order cancelled", {
      cancelledAt: new Date(),
      fulfillmentStatus: "CANCELLED",
    });
  },

  async ship(id: string, actorId?: string) {
    return transitionStatus(id, "SHIPPED", actorId, "ORDER_SHIPPED", "Order shipped");
  },

  async complete(id: string, actorId?: string) {
    return transitionStatus(id, "COMPLETED", actorId, "ORDER_COMPLETED", "Order completed", {
      completedAt: new Date(),
    });
  },

  async timeline(id: string) {
    const storeId = await getDefaultStoreId();
    const order = await prisma.order.findFirst({
      where: { id, storeId, deletedAt: null },
      select: { id: true },
    });
    if (!order) throw new AppError(404, "Order not found", "ORDER_NOT_FOUND");

    return prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        note: true,
        createdById: true,
        createdAt: true,
      },
    });
  },
};
