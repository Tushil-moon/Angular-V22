import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { CreateMediaInput, ListMediaQuery } from "./media.validation";

const mediaSelect = {
  id: true,
  storeId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  url: true,
  storageKey: true,
  altText: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MediaAssetSelect;

export const mediaService = {
  async list(query: ListMediaQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.MediaAssetWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.mimeType ? { mimeType: { startsWith: query.mimeType } } : {}),
      ...(query.search
        ? {
            OR: [
              { filename: { contains: query.search, mode: "insensitive" } },
              { originalName: { contains: query.search, mode: "insensitive" } },
              { altText: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.MediaAssetOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      filename: { filename: query.order },
      size_bytes: { sizeBytes: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.mediaAsset.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: mediaSelect,
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const asset = await prisma.mediaAsset.findFirst({
      where: { id, storeId, deletedAt: null },
      select: mediaSelect,
    });
    if (!asset) throw new AppError(404, "Media asset not found", "MEDIA_NOT_FOUND");
    return asset;
  },

  async create(input: CreateMediaInput) {
    const storeId = await getDefaultStoreId();

    const existing = await prisma.mediaAsset.findFirst({
      where: { storeId, storageKey: input.storageKey, deletedAt: null },
    });
    if (existing) {
      throw new AppError(409, "Media storage key already exists", "MEDIA_STORAGE_KEY_EXISTS");
    }

    return prisma.mediaAsset.create({
      data: {
        storeId,
        url: input.url,
        storageKey: input.storageKey,
        mimeType: input.mimeType,
        sizeBytes: input.size,
        filename: input.fileName,
        originalName: input.originalName ?? input.fileName,
        width: input.width ?? null,
        height: input.height ?? null,
        altText: input.altText ?? null,
      },
      select: mediaSelect,
    });
  },
};
