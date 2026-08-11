import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { ListPaymentsQuery } from "./payment.validation";

const paymentSelect = {
  id: true,
  storeId: true,
  orderId: true,
  providerId: true,
  status: true,
  amount: true,
  currencyCode: true,
  providerReference: true,
  idempotencyKey: true,
  authorizedAt: true,
  capturedAt: true,
  failedAt: true,
  createdAt: true,
  updatedAt: true,
  order: { select: { id: true, orderNumber: true, customerEmail: true, status: true } },
} satisfies Prisma.PaymentTransactionSelect;

export const paymentService = {
  async list(query: ListPaymentsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PaymentTransactionWhereInput = {
      storeId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
    };

    const sortMap: Record<string, Prisma.PaymentTransactionOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      amount: { amount: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.paymentTransaction.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: paymentSelect,
      }),
      prisma.paymentTransaction.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const payment = await prisma.paymentTransaction.findFirst({
      where: { id, storeId },
      select: {
        ...paymentSelect,
        rawResponse: true,
        refunds: {
          select: {
            id: true,
            status: true,
            amount: true,
            currencyCode: true,
            createdAt: true,
          },
        },
      },
    });
    if (!payment) throw new AppError(404, "Payment not found", "PAYMENT_NOT_FOUND");
    return payment;
  },
};
