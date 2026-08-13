import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreateCollectionInput,
  ListCollectionsQuery,
  UpdateCollectionInput,
} from "./collection.validation";

const collectionSelect = {
  id: true,
  storeId: true,
  name: true,
  slug: true,
  description: true,
  type: true,
  featured: true,
  status: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { products: true } },
} satisfies Prisma.CollectionSelect;

export const collectionService = {
  async list(query: ListCollectionsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CollectionWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.CollectionOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      name: { name: query.order },
      sort_order: { sortOrder: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.collection.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: collectionSelect,
      }),
      prisma.collection.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const collection = await prisma.collection.findFirst({
      where: { id, storeId, deletedAt: null },
      select: collectionSelect,
    });
    if (!collection) throw new AppError(404, "Collection not found", "COLLECTION_NOT_FOUND");
    return collection;
  },

  async create(input: CreateCollectionInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.collection.findFirst({
      where: { storeId, slug: input.slug, deletedAt: null },
    });
    if (existing) throw new AppError(409, "Slug already exists", "COLLECTION_SLUG_EXISTS");

    return prisma.collection.create({
      data: {
        storeId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        type: input.type ?? "MANUAL",
        status: input.status ?? "PUBLISHED",
        featured: input.featured ?? false,
        sortOrder: input.sortOrder ?? 0,
      },
      select: collectionSelect,
    });
  },

  async update(id: string, input: UpdateCollectionInput) {
    await this.getById(id);
    return prisma.collection.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.featured !== undefined ? { featured: input.featured } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
      select: collectionSelect,
    });
  },

  async remove(id: string) {
    await this.getById(id);
    await prisma.collection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
