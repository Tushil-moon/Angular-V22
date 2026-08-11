import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { CreateCouponInput, ListCouponsQuery, UpdateCouponInput } from "./coupon.validation";

const couponSelect = {
  id: true,
  storeId: true,
  promotionId: true,
  code: true,
  status: true,
  usageLimit: true,
  usageCount: true,
  perCustomerLimit: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CouponSelect;

export const couponService = {
  async list(query: ListCouponsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CouponWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.promotionId ? { promotionId: query.promotionId } : {}),
      ...(query.search ? { code: { contains: query.search, mode: "insensitive" } } : {}),
    };

    const sortMap: Record<string, Prisma.CouponOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      code: { code: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.coupon.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: couponSelect,
      }),
      prisma.coupon.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const coupon = await prisma.coupon.findFirst({
      where: { id, storeId, deletedAt: null },
      select: couponSelect,
    });
    if (!coupon) throw new AppError(404, "Coupon not found", "COUPON_NOT_FOUND");
    return coupon;
  },

  async create(input: CreateCouponInput) {
    const storeId = await getDefaultStoreId();

    const existing = await prisma.coupon.findFirst({
      where: { storeId, code: input.code, deletedAt: null },
    });
    if (existing) throw new AppError(409, "Coupon code already exists", "COUPON_CODE_EXISTS");

    if (input.promotionId) {
      const promotion = await prisma.promotion.findFirst({
        where: { id: input.promotionId, storeId, deletedAt: null },
      });
      if (!promotion) throw new AppError(404, "Promotion not found", "PROMOTION_NOT_FOUND");
    }

    return prisma.coupon.create({
      data: {
        storeId,
        code: input.code,
        promotionId: input.promotionId ?? null,
        status: input.status ?? "ACTIVE",
        usageLimit: input.usageLimit ?? null,
        perCustomerLimit: input.perCustomerLimit ?? null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      },
      select: couponSelect,
    });
  },

  async update(id: string, input: UpdateCouponInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.coupon.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Coupon not found", "COUPON_NOT_FOUND");

    if (input.code && input.code !== existing.code) {
      const codeTaken = await prisma.coupon.findFirst({
        where: { storeId, code: input.code, deletedAt: null, NOT: { id } },
      });
      if (codeTaken) throw new AppError(409, "Coupon code already exists", "COUPON_CODE_EXISTS");
    }

    if (input.promotionId) {
      const promotion = await prisma.promotion.findFirst({
        where: { id: input.promotionId, storeId, deletedAt: null },
      });
      if (!promotion) throw new AppError(404, "Promotion not found", "PROMOTION_NOT_FOUND");
    }

    return prisma.coupon.update({
      where: { id },
      data: {
        code: input.code,
        promotionId: input.promotionId === undefined ? undefined : input.promotionId,
        status: input.status,
        usageLimit: input.usageLimit === undefined ? undefined : input.usageLimit,
        perCustomerLimit: input.perCustomerLimit === undefined ? undefined : input.perCustomerLimit,
        startsAt: input.startsAt === undefined ? undefined : input.startsAt,
        endsAt: input.endsAt === undefined ? undefined : input.endsAt,
      },
      select: couponSelect,
    });
  },

  async remove(id: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.coupon.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Coupon not found", "COUPON_NOT_FOUND");

    await prisma.coupon.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
  },
};
