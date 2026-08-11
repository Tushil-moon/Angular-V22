import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "./category.validation";

const categorySelect = {
  id: true,
  storeId: true,
  parentId: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  sortOrder: true,
  metaTitle: true,
  metaDescription: true,
  createdAt: true,
  updatedAt: true,
  parent: { select: { id: true, name: true, slug: true } },
  _count: { select: { children: true, products: true } },
} satisfies Prisma.CategorySelect;

export const categoryService = {
  async list(query: ListCategoriesQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CategoryWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.parentId !== undefined ? { parentId: query.parentId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.CategoryOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      name: { name: query.order },
      sort_order: { sortOrder: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.category.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "sort_order"] ?? { sortOrder: "asc" },
        select: categorySelect,
      }),
      prisma.category.count({ where }),
    ]);

    return {
      data: items,
      ...buildPaginationMeta(total, page, pageSize),
    };
  },

  async tree() {
    const storeId = await getDefaultStoreId();
    const categories = await prisma.category.findMany({
      where: { storeId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        status: true,
        sortOrder: true,
      },
    });

    type TreeNode = (typeof categories)[number] & { children: TreeNode[] };
    const byId = new Map<string, TreeNode>();
    for (const cat of categories) {
      byId.set(cat.id, { ...cat, children: [] });
    }

    const roots: TreeNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const category = await prisma.category.findFirst({
      where: { id, storeId, deletedAt: null },
      select: {
        ...categorySelect,
        children: {
          where: { deletedAt: null },
          select: { id: true, name: true, slug: true, status: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!category) throw new AppError(404, "Category not found", "CATEGORY_NOT_FOUND");
    return category;
  },

  async create(input: CreateCategoryInput, actorId?: string) {
    const storeId = await getDefaultStoreId();

    if (input.parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: input.parentId, storeId, deletedAt: null },
      });
      if (!parent) throw new AppError(404, "Parent category not found", "PARENT_CATEGORY_NOT_FOUND");
    }

    const existing = await prisma.category.findFirst({
      where: { storeId, slug: input.slug, deletedAt: null },
    });
    if (existing) throw new AppError(409, "Category slug already exists", "CATEGORY_SLUG_EXISTS");

    return prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: {
          storeId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          parentId: input.parentId ?? null,
          status: input.status,
          sortOrder: input.sortOrder ?? 0,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
        },
        select: categorySelect,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "CATEGORY_CREATED",
          resource: "category",
          resourceId: created.id,
          metadata: { name: created.name, slug: created.slug },
        },
      });

      return created;
    });
  },

  async update(id: string, input: UpdateCategoryInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.category.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Category not found", "CATEGORY_NOT_FOUND");

    if (input.parentId === id) {
      throw new AppError(400, "Category cannot be its own parent", "INVALID_PARENT");
    }

    if (input.parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: input.parentId, storeId, deletedAt: null },
      });
      if (!parent) throw new AppError(404, "Parent category not found", "PARENT_CATEGORY_NOT_FOUND");
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await prisma.category.findFirst({
        where: { storeId, slug: input.slug, deletedAt: null, NOT: { id } },
      });
      if (slugTaken) throw new AppError(409, "Category slug already exists", "CATEGORY_SLUG_EXISTS");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          parentId: input.parentId === undefined ? undefined : input.parentId,
          status: input.status,
          sortOrder: input.sortOrder,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
        },
        select: categorySelect,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "CATEGORY_UPDATED",
          resource: "category",
          resourceId: id,
          metadata: { changes: Object.keys(input) },
        },
      });

      return updated;
    });
  },

  async remove(id: string, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.category.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Category not found", "CATEGORY_NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id },
        data: { deletedAt: new Date(), status: "ARCHIVED" },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "CATEGORY_UPDATED",
          resource: "category",
          resourceId: id,
          metadata: { softDeleted: true },
        },
      });
    });
  },
};
