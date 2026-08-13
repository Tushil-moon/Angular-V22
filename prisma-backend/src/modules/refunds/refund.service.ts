import { PaymentStatus, Prisma, RefundStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { CreateRefundInput, ListRefundsQuery, UpdateRefundInput } from "./refund.validation";

const refundSelect = {
  id: true,
  storeId: true,
  orderId: true,
  paymentId: true,
  status: true,
  amount: true,
  currencyCode: true,
  reason: true,
  note: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
  order: {
    select: {
      id: true,
      orderNumber: true,
      customerEmail: true,
      grandTotal: true,
      amountRefunded: true,
      currencyCode: true,
    },
  },
  payment: {
    select: {
      id: true,
      status: true,
      amount: true,
      providerReference: true,
    },
  },
  items: {
    select: {
      id: true,
      orderItemId: true,
      quantity: true,
      amount: true,
      restock: true,
      orderItem: {
        select: {
          productName: true,
          sku: true,
        },
      },
    },
  },
} satisfies Prisma.RefundSelect;

const ALLOWED_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PROCESSING", "REJECTED"],
  PROCESSING: ["COMPLETED", "REJECTED"],
  COMPLETED: [],
  REJECTED: [],
};

function decimal(value: Prisma.Decimal | number | string): number {
  return Number(value);
}

async function applyRefundCompletion(refundId: string, storeId: string) {
  const refund = await prisma.refund.findFirst({
    where: { id: refundId, storeId },
    include: { order: true, payment: true },
  });
  if (!refund) return;

  const refundAmount = decimal(refund.amount);
  const order = refund.order;
  const newRefundedTotal = decimal(order.amountRefunded) + refundAmount;
  const grandTotal = decimal(order.grandTotal);
  const fullyRefunded = newRefundedTotal >= grandTotal - 0.0001;

  const orderPaymentStatus: PaymentStatus = fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED";
  const orderStatus = fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED";

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        amountRefunded: new Prisma.Decimal(newRefundedTotal),
        paymentStatus: orderPaymentStatus,
        status: orderStatus,
      },
    }),
    ...(refund.paymentId
      ? [
          prisma.paymentTransaction.update({
            where: { id: refund.paymentId },
            data: {
              status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
            },
          }),
        ]
      : []),
  ]);
}

export const refundService = {
  async list(query: ListRefundsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.RefundWhereInput = {
      storeId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.search
        ? {
            OR: [
              { order: { orderNumber: { contains: query.search, mode: "insensitive" } } },
              { reason: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.RefundOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      amount: { amount: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.refund.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: refundSelect,
      }),
      prisma.refund.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const refund = await prisma.refund.findFirst({
      where: { id, storeId },
      select: refundSelect,
    });
    if (!refund) throw new AppError(404, "Refund not found", "REFUND_NOT_FOUND");
    return refund;
  },

  async create(input: CreateRefundInput) {
    const storeId = await getDefaultStoreId();

    const order = await prisma.order.findFirst({
      where: { id: input.orderId, storeId, deletedAt: null },
      include: {
        payments: {
          where: { status: { in: ["CAPTURED", "PARTIALLY_REFUNDED"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        items: { select: { id: true } },
      },
    });

    if (!order) throw new AppError(404, "Order not found", "ORDER_NOT_FOUND");
    if (order.status === "CANCELLED") {
      throw new AppError(400, "Cannot refund a cancelled order", "ORDER_CANCELLED");
    }

    const refundableRemaining =
      decimal(order.grandTotal) - decimal(order.amountRefunded);
    if (input.amount > refundableRemaining + 0.0001) {
      throw new AppError(
        400,
        `Refund amount exceeds refundable balance (${refundableRemaining.toFixed(2)})`,
        "REFUND_AMOUNT_EXCEEDS_BALANCE",
      );
    }

    let paymentId = input.paymentId ?? null;
    if (paymentId) {
      const payment = await prisma.paymentTransaction.findFirst({
        where: { id: paymentId, storeId, orderId: order.id },
      });
      if (!payment) throw new AppError(404, "Payment not found", "PAYMENT_NOT_FOUND");
    } else if (order.payments.length) {
      paymentId = order.payments[0]!.id;
    }

    if (input.items?.length) {
      const orderItemIds = new Set(order.items.map((item) => item.id));
      for (const item of input.items) {
        if (!orderItemIds.has(item.orderItemId)) {
          throw new AppError(400, "Invalid order line item", "INVALID_REFUND_ITEM");
        }
      }
    }

    return prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          storeId,
          orderId: order.id,
          paymentId,
          status: "REQUESTED",
          amount: new Prisma.Decimal(input.amount),
          currencyCode: order.currencyCode,
          reason: input.reason ?? null,
          note: input.note ?? null,
          ...(input.items?.length
            ? {
                items: {
                  create: input.items.map((item) => ({
                    orderItemId: item.orderItemId,
                    quantity: item.quantity,
                    amount: new Prisma.Decimal(item.amount),
                    restock: item.restock ?? false,
                  })),
                },
              }
            : {}),
        },
        select: refundSelect,
      });
      return refund;
    });
  },

  async updateStatus(id: string, input: UpdateRefundInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.refund.findFirst({
      where: { id, storeId },
    });
    if (!existing) throw new AppError(404, "Refund not found", "REFUND_NOT_FOUND");

    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new AppError(
        400,
        `Cannot transition refund from ${existing.status} to ${input.status}`,
        "INVALID_REFUND_TRANSITION",
      );
    }

    const processedAt =
      input.status === "COMPLETED" && !existing.processedAt ? new Date() : undefined;

    const refund = await prisma.refund.update({
      where: { id },
      data: {
        status: input.status,
        note: input.note === undefined ? undefined : input.note,
        processedAt,
      },
      select: refundSelect,
    });

    if (input.status === "COMPLETED") {
      await applyRefundCompletion(id, storeId);
    }

    return refund;
  },
};
