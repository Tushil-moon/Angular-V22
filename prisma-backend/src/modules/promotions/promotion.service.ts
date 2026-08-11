import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreatePromotionInput,
  ListPromotionsQuery,
  UpdatePromotionInput,
} from "./promotion.validation";

const promotionSelect = {
  id: true,
  storeId: true,
  name: true,
  code: true,
  type: true,
  value: true,
  startsAt: true,
  endsAt: true,
  usageLimit: true,
  usageCount: true,
  perCustomerLimit: true,
  minSubtotal: true,
  stackable: true,
  enabled: true,
  rules: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PromotionSelect;

export const promotionService = {
  async list(query: ListPromotionsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PromotionWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.PromotionOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      name: { name: query.order },
      starts_at: { startsAt: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.promotion.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: promotionSelect,
      }),
      prisma.promotion.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const promotion = await prisma.promotion.findFirst({
      where: { id, storeId, deletedAt: null },
      select: promotionSelect,
    });
    if (!promotion) throw new AppError(404, "Promotion not found", "PROMOTION_NOT_FOUND");
    return promotion;
  },

  async create(input: CreatePromotionInput) {
    const storeId = await getDefaultStoreId();

    if (input.code) {
      const existing = await prisma.promotion.findFirst({
        where: { storeId, code: input.code, deletedAt: null },
      });
      if (existing) throw new AppError(409, "Promotion code already exists", "PROMOTION_CODE_EXISTS");
    }

    return prisma.promotion.create({
      data: {
        storeId,
        name: input.name,
        code: input.code,
        type: input.type,
        value: input.value,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        usageLimit: input.usageLimit ?? null,
        perCustomerLimit: input.perCustomerLimit ?? null,
        minSubtotal: input.minSubtotal ?? null,
        stackable: input.stackable ?? false,
        enabled: input.enabled ?? true,
        rules: input.rules === undefined || input.rules === null ? Prisma.JsonNull : (input.rules as Prisma.InputJsonValue),
      },
      select: promotionSelect,
    });
  },

  async update(id: string, input: UpdatePromotionInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.promotion.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Promotion not found", "PROMOTION_NOT_FOUND");

    if (input.code && input.code !== existing.code) {
      const codeTaken = await prisma.promotion.findFirst({
        where: { storeId, code: input.code, deletedAt: null, NOT: { id } },
      });
      if (codeTaken) throw new AppError(409, "Promotion code already exists", "PROMOTION_CODE_EXISTS");
    }

    return prisma.promotion.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code,
        type: input.type,
        value: input.value,
        startsAt: input.startsAt === undefined ? undefined : input.startsAt,
        endsAt: input.endsAt === undefined ? undefined : input.endsAt,
        usageLimit: input.usageLimit === undefined ? undefined : input.usageLimit,
        perCustomerLimit: input.perCustomerLimit === undefined ? undefined : input.perCustomerLimit,
        minSubtotal: input.minSubtotal === undefined ? undefined : input.minSubtotal,
        stackable: input.stackable,
        enabled: input.enabled,
        rules:
          input.rules === undefined
            ? undefined
            : input.rules === null
              ? Prisma.JsonNull
              : (input.rules as Prisma.InputJsonValue),
      },
      select: promotionSelect,
    });
  },

  async remove(id: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.promotion.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Promotion not found", "PROMOTION_NOT_FOUND");

    await prisma.promotion.update({
      where: { id },
      data: { deletedAt: new Date(), enabled: false },
    });
  },
};
