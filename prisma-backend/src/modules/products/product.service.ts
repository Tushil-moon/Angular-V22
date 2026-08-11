import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreateProductInput,
  CreateVariantInput,
  ListProductsQuery,
  UpdateProductInput,
  UpdateVariantInput,
} from "./product.validation";

const productSelect = {
  id: true,
  storeId: true,
  brandId: true,
  name: true,
  slug: true,
  description: true,
  shortDescription: true,
  type: true,
  status: true,
  visibility: true,
  featured: true,
  metaTitle: true,
  metaDescription: true,
  sortOrder: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  brand: { select: { id: true, name: true, slug: true } },
  categories: {
    select: { category: { select: { id: true, name: true, slug: true } } },
  },
  variants: {
    where: { deletedAt: null },
    select: {
      id: true,
      sku: true,
      title: true,
      price: true,
      compareAtPrice: true,
      status: true,
      barcode: true,
    },
    take: 50,
  },
  images: {
    select: { id: true, url: true, altText: true, position: true },
    orderBy: { position: "asc" as const },
    take: 10,
  },
} satisfies Prisma.ProductSelect;

const mapProduct = (product: Prisma.ProductGetPayload<{ select: typeof productSelect }>) => ({
  ...product,
  categories: product.categories.map((entry) => entry.category),
  price: product.variants[0]?.price ?? null,
  sku: product.variants[0]?.sku ?? null,
});

export const productService = {
  async list(query: ListProductsQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.categoryId
        ? { categories: { some: { categoryId: query.categoryId } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
              { variants: { some: { sku: { contains: query.search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.ProductOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      name: { name: query.order },
      status: { status: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: productSelect,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: items.map(mapProduct),
      ...buildPaginationMeta(total, page, pageSize),
    };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const product = await prisma.product.findFirst({
      where: { id, storeId, deletedAt: null },
      select: {
        ...productSelect,
        options: {
          select: {
            id: true,
            name: true,
            position: true,
            values: { select: { id: true, value: true, position: true } },
          },
          orderBy: { position: "asc" },
        },
        attributes: {
          select: { id: true, name: true, value: true, position: true },
          orderBy: { position: "asc" },
        },
      },
    });

    if (!product) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");
    return mapProduct(product as Prisma.ProductGetPayload<{ select: typeof productSelect }>);
  },

  async create(input: CreateProductInput, actorId?: string) {
    const storeId = await getDefaultStoreId();

    const existing = await prisma.product.findFirst({
      where: { storeId, slug: input.slug, deletedAt: null },
    });
    if (existing) throw new AppError(409, "Product slug already exists", "PRODUCT_SLUG_EXISTS");

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          storeId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          shortDescription: input.shortDescription,
          type: input.type,
          status: input.status,
          visibility: input.visibility,
          brandId: input.brandId ?? null,
          featured: input.featured ?? false,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          publishedAt: input.status === "PUBLISHED" ? new Date() : null,
          categories: input.categoryIds?.length
            ? { create: input.categoryIds.map((categoryId) => ({ categoryId })) }
            : undefined,
          variants: {
            create: {
              storeId,
              sku: input.sku ?? `${input.slug}-default`,
              title: input.name,
              price: input.price ?? 0,
              compareAtPrice: input.compareAtPrice,
              status: input.status === "ARCHIVED" ? "ARCHIVED" : "PUBLISHED",
              trackInventory: input.trackInventory ?? true,
            },
          },
        },
        select: productSelect,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "PRODUCT_CREATED",
          resource: "product",
          resourceId: created.id,
          metadata: { name: created.name, slug: created.slug },
        },
      });

      return created;
    });

    return mapProduct(product);
  },

  async update(id: string, input: UpdateProductInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.product.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await prisma.product.findFirst({
        where: { storeId, slug: input.slug, deletedAt: null, NOT: { id } },
      });
      if (slugTaken) throw new AppError(409, "Product slug already exists", "PRODUCT_SLUG_EXISTS");
    }

    const product = await prisma.$transaction(async (tx) => {
      if (input.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (input.categoryIds.length) {
          await tx.productCategory.createMany({
            data: input.categoryIds.map((categoryId) => ({ productId: id, categoryId })),
          });
        }
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          shortDescription: input.shortDescription,
          type: input.type,
          status: input.status,
          visibility: input.visibility,
          brandId: input.brandId === undefined ? undefined : input.brandId,
          featured: input.featured,
          metaTitle: input.metaTitle,
          metaDescription: input.metaDescription,
          publishedAt:
            input.status === "PUBLISHED" && existing.status !== "PUBLISHED"
              ? new Date()
              : input.status && input.status !== "PUBLISHED"
                ? null
                : undefined,
        },
        select: productSelect,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "PRODUCT_UPDATED",
          resource: "product",
          resourceId: id,
          metadata: { changes: Object.keys(input) },
        },
      });

      return updated;
    });

    return mapProduct(product);
  },

  async remove(id: string, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.product.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { deletedAt: new Date(), status: "ARCHIVED" },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "PRODUCT_DELETED",
          resource: "product",
          resourceId: id,
        },
      });
    });
  },

  async publish(id: string, actorId?: string) {
    return this.update(id, { status: "PUBLISHED" }, actorId);
  },

  async archive(id: string, actorId?: string) {
    return this.update(id, { status: "ARCHIVED" }, actorId);
  },

  async duplicate(id: string, actorId?: string) {
    const source = await this.getById(id);
    const slug = `${source.slug}-copy-${Date.now().toString(36)}`;
    return this.create(
      {
        name: `${source.name} (Copy)`,
        slug,
        description: source.description ?? undefined,
        shortDescription: source.shortDescription ?? undefined,
        type: source.type,
        status: "DRAFT",
        visibility: source.visibility,
        brandId: source.brandId,
        categoryIds: source.categories.map((c) => c.id),
        featured: false,
        price: source.price ? Number(source.price) : 0,
        sku: source.sku ? `${source.sku}-COPY` : undefined,
      },
      actorId,
    );
  },

  async listVariants(productId: string) {
    const storeId = await getDefaultStoreId();
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");

    return prisma.productVariant.findMany({
      where: { productId, deletedAt: null },
      orderBy: { position: "asc" },
    });
  },

  async createVariant(productId: string, input: CreateVariantInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId, deletedAt: null },
    });
    if (!product) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");

    try {
      const variant = await prisma.$transaction(async (tx) => {
        const created = await tx.productVariant.create({
          data: {
            storeId,
            productId,
            sku: input.sku,
            title: input.title,
            barcode: input.barcode,
            price: input.price,
            compareAtPrice: input.compareAtPrice,
            costPrice: input.costPrice,
            status: input.status,
            trackInventory: input.trackInventory ?? true,
            optionValues: input.optionValueIds?.length
              ? { create: input.optionValueIds.map((optionValueId) => ({ optionValueId })) }
              : undefined,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: "VARIANT_CREATED",
            resource: "product_variant",
            resourceId: created.id,
            metadata: { productId, sku: created.sku },
          },
        });
        return created;
      });
      return variant;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "SKU already exists", "VARIANT_SKU_EXISTS");
      }
      throw error;
    }
  },

  async updateVariant(
    productId: string,
    variantId: string,
    input: UpdateVariantInput,
    actorId?: string,
  ) {
    const storeId = await getDefaultStoreId();
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId, storeId, deletedAt: null },
    });
    if (!variant) throw new AppError(404, "Variant not found", "VARIANT_NOT_FOUND");

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          sku: input.sku,
          title: input.title,
          barcode: input.barcode,
          price: input.price,
          compareAtPrice: input.compareAtPrice,
          costPrice: input.costPrice,
          status: input.status,
          trackInventory: input.trackInventory,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "VARIANT_UPDATED",
          resource: "product_variant",
          resourceId: variantId,
        },
      });
      return result;
    });

    return updated;
  },

  async deleteVariant(productId: string, variantId: string) {
    const storeId = await getDefaultStoreId();
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId, storeId, deletedAt: null },
    });
    if (!variant) throw new AppError(404, "Variant not found", "VARIANT_NOT_FOUND");

    await prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  },
};
