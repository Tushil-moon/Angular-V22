import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { ListReviewsQuery, UpdateReviewInput } from "./review.validation";

const reviewSelect = {
  id: true,
  storeId: true,
  productId: true,
  customerId: true,
  rating: true,
  title: true,
  body: true,
  status: true,
  isVerifiedPurchase: true,
  adminReply: true,
  adminRepliedAt: true,
  createdAt: true,
  updatedAt: true,
  product: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ReviewSelect;

export const reviewService = {
  async list(query: ListReviewsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ReviewWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { body: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.ReviewOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      rating: { rating: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: reviewSelect,
      }),
      prisma.review.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const review = await prisma.review.findFirst({
      where: { id, storeId, deletedAt: null },
      select: reviewSelect,
    });
    if (!review) throw new AppError(404, "Review not found", "REVIEW_NOT_FOUND");
    return review;
  },

  async update(id: string, input: UpdateReviewInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.review.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Review not found", "REVIEW_NOT_FOUND");

    return prisma.review.update({
      where: { id },
      data: {
        status: input.status,
        adminReply: input.adminReply === undefined ? undefined : input.adminReply,
        adminRepliedAt:
          input.adminReply === undefined
            ? undefined
            : input.adminReply
              ? new Date()
              : null,
      },
      select: reviewSelect,
    });
  },
};
