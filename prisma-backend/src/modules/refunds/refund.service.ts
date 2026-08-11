import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { ListRefundsQuery, UpdateRefundInput } from "./refund.validation";

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
} satisfies Prisma.RefundSelect;

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

  async updateStatus(id: string, input: UpdateRefundInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.refund.findFirst({
      where: { id, storeId },
    });
    if (!existing) throw new AppError(404, "Refund not found", "REFUND_NOT_FOUND");

    const processedAt =
      input.status === "COMPLETED" && !existing.processedAt ? new Date() : undefined;

    return prisma.refund.update({
      where: { id },
      data: {
        status: input.status,
        note: input.note === undefined ? undefined : input.note,
        processedAt,
      },
      select: refundSelect,
    });
  },
};
