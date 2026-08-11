import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreateGiftCardInput,
  ListGiftCardsQuery,
  UpdateGiftCardInput,
} from "./gift-card.validation";

const giftCardSelect = {
  id: true,
  storeId: true,
  customerId: true,
  code: true,
  initialBalance: true,
  balance: true,
  currencyCode: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.GiftCardSelect;

const assertCustomerExists = async (storeId: string, customerId: string) => {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, storeId, deletedAt: null },
    select: { id: true },
  });
  if (!customer) throw new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");
};

export const giftCardService = {
  async list(query: ListGiftCardsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.GiftCardWhereInput = {
      storeId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search ? { code: { contains: query.search, mode: "insensitive" } } : {}),
    };

    const sortMap: Record<string, Prisma.GiftCardOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      code: { code: query.order },
      expires_at: { expiresAt: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.giftCard.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: giftCardSelect,
      }),
      prisma.giftCard.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const giftCard = await prisma.giftCard.findFirst({
      where: { id, storeId },
      select: giftCardSelect,
    });
    if (!giftCard) throw new AppError(404, "Gift card not found", "GIFT_CARD_NOT_FOUND");
    return giftCard;
  },

  async create(input: CreateGiftCardInput) {
    const storeId = await getDefaultStoreId();

    const existing = await prisma.giftCard.findFirst({
      where: { storeId, code: input.code },
    });
    if (existing) throw new AppError(409, "Gift card code already exists", "GIFT_CARD_CODE_EXISTS");

    if (input.customerId) {
      await assertCustomerExists(storeId, input.customerId);
    }

    return prisma.giftCard.create({
      data: {
        storeId,
        code: input.code,
        initialBalance: input.initialBalance,
        balance: input.balance ?? input.initialBalance,
        currencyCode: input.currencyCode,
        status: input.status ?? "ACTIVE",
        expiresAt: input.expiresAt ?? null,
        customerId: input.customerId ?? null,
      },
      select: giftCardSelect,
    });
  },

  async update(id: string, input: UpdateGiftCardInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.giftCard.findFirst({
      where: { id, storeId },
    });
    if (!existing) throw new AppError(404, "Gift card not found", "GIFT_CARD_NOT_FOUND");

    if (input.code && input.code !== existing.code) {
      const codeTaken = await prisma.giftCard.findFirst({
        where: { storeId, code: input.code, NOT: { id } },
      });
      if (codeTaken) throw new AppError(409, "Gift card code already exists", "GIFT_CARD_CODE_EXISTS");
    }

    if (input.customerId) {
      await assertCustomerExists(storeId, input.customerId);
    }

    return prisma.giftCard.update({
      where: { id },
      data: {
        code: input.code,
        initialBalance: input.initialBalance,
        balance: input.balance,
        currencyCode: input.currencyCode,
        status: input.status,
        expiresAt: input.expiresAt === undefined ? undefined : input.expiresAt,
        customerId: input.customerId === undefined ? undefined : input.customerId,
      },
      select: giftCardSelect,
    });
  },
};
