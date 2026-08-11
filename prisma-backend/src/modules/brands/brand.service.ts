import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { CreateBrandInput, ListBrandsQuery, UpdateBrandInput } from "./brand.validation";

const brandSelect = {
  id: true,
  storeId: true,
  name: true,
  slug: true,
  description: true,
  website: true,
  status: true,
  sortOrder: true,
  metaTitle: true,
  metaDescription: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { products: true } },
} satisfies Prisma.BrandSelect;

export const brandService = {
  async list(query: ListBrandsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BrandWhereInput = {
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

    const sortMap: Record<string, Prisma.BrandOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      name: { name: query.order },
      sort_order: { sortOrder: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.brand.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "name"] ?? { name: "asc" },
        select: brandSelect,
      }),
      prisma.brand.count({ where }),
    ]);

    return {
      data: items,
      ...buildPaginationMeta(total, page, pageSize),
    };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const brand = await prisma.brand.findFirst({
      where: { id, storeId, deletedAt: null },
      select: brandSelect,
    });
    if (!brand) throw new AppError(404, "Brand not found", "BRAND_NOT_FOUND");
    return brand;
  },

  async create(input: CreateBrandInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.brand.findFirst({
      where: { storeId, slug: input.slug, deletedAt: null },
    });
    if (existing) throw new AppError(409, "Brand slug already exists", "BRAND_SLUG_EXISTS");

    return prisma.$transaction(async (tx) => {
      const created = await tx.brand.create({
        data: {
          storeId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          website: input.website || null,
          status: input.status,
          sortOrder: input.sortOrder ?? 0,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
        },
        select: brandSelect,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "BRAND_CREATED",
          resource: "brand",
          resourceId: created.id,
          metadata: { name: created.name, slug: created.slug },
        },
      });

      return created;
    });
  },

  async update(id: string, input: UpdateBrandInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.brand.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Brand not found", "BRAND_NOT_FOUND");

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await prisma.brand.findFirst({
        where: { storeId, slug: input.slug, deletedAt: null, NOT: { id } },
      });
      if (slugTaken) throw new AppError(409, "Brand slug already exists", "BRAND_SLUG_EXISTS");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.brand.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          website: input.website === undefined ? undefined : input.website || null,
          status: input.status,
          sortOrder: input.sortOrder,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
        },
        select: brandSelect,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "BRAND_CREATED",
          resource: "brand",
          resourceId: id,
          metadata: { updated: true, changes: Object.keys(input) },
        },
      });

      return updated;
    });
  },

  async remove(id: string, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.brand.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Brand not found", "BRAND_NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      await tx.brand.update({
        where: { id },
        data: { deletedAt: new Date(), status: "ARCHIVED" },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "BRAND_CREATED",
          resource: "brand",
          resourceId: id,
          metadata: { softDeleted: true },
        },
      });
    });
  },
};
