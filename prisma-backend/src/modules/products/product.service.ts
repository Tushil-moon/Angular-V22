import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import {
  buildImportLookupMaps,
  parseCsvRowToProduct,
  type ProductImportFieldKey,
} from "./product-import.util";
import type {
  AddProductImageInput,
  BulkImportProductsInput,
  CreateProductInput,
  CreateVariantInput,
  ListProductsQuery,
  ReorderProductImagesInput,
  UpdateProductInput,
  UpdateProductImageInput,
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
      trackInventory: true,
    },
    take: 50,
  },
  images: {
    select: { id: true, url: true, altText: true, position: true, mediaId: true },
    orderBy: { position: "asc" as const },
    take: 20,
  },
} satisfies Prisma.ProductSelect;

const mapProduct = (product: Prisma.ProductGetPayload<{ select: typeof productSelect }>) => ({
  ...product,
  categories: product.categories.map((entry) => entry.category),
  price: product.variants[0]?.price ?? null,
  sku: product.variants[0]?.sku ?? null,
});

const findDefaultWarehouse = async (tx: Prisma.TransactionClient, storeId: string) =>
  tx.warehouse.findFirst({
    where: { storeId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

const seedInventoryForVariant = async (
  tx: Prisma.TransactionClient,
  storeId: string,
  variantId: string,
  quantity: number,
) => {
  if (quantity <= 0) return;

  const warehouse = await findDefaultWarehouse(tx, storeId);
  if (!warehouse) return;

  await tx.inventoryItem.upsert({
    where: {
      warehouseId_variantId: {
        warehouseId: warehouse.id,
        variantId,
      },
    },
    create: {
      storeId,
      warehouseId: warehouse.id,
      variantId,
      quantityOnHand: quantity,
      quantityReserved: 0,
      quantityAvailable: quantity,
    },
    update: {
      quantityOnHand: { increment: quantity },
      quantityAvailable: { increment: quantity },
    },
  });
};

const syncPrimaryImage = async (
  tx: Prisma.TransactionClient,
  productId: string,
  image: NonNullable<CreateProductInput["primaryImage"]>,
) => {
  const existing = await tx.productImage.findFirst({
    where: { productId },
    orderBy: { position: "asc" },
  });

  if (existing) {
    await tx.productImage.update({
      where: { id: existing.id },
      data: {
        url: image.url,
        altText: image.altText,
        mediaId: image.mediaId ?? null,
      },
    });
    return;
  }

  await tx.productImage.create({
    data: {
      productId,
      url: image.url,
      altText: image.altText,
      mediaId: image.mediaId ?? null,
      position: 0,
    },
  });
};

const syncDefaultVariant = async (
  tx: Prisma.TransactionClient,
  productId: string,
  storeId: string,
  input: UpdateProductInput,
  productName?: string,
) => {
  const hasVariantChanges =
    input.price !== undefined ||
    input.compareAtPrice !== undefined ||
    input.sku !== undefined ||
    input.trackInventory !== undefined ||
    productName !== undefined;

  if (!hasVariantChanges) return null;

  const variant = await tx.productVariant.findFirst({
    where: { productId, storeId, deletedAt: null },
    orderBy: { position: "asc" },
  });
  if (!variant) return null;

  return tx.productVariant.update({
    where: { id: variant.id },
    data: {
      sku: input.sku,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      trackInventory: input.trackInventory,
      title: productName,
    },
  });
};

const resolveTrackInventoryDefault = (type: CreateProductInput["type"], explicit?: boolean) => {
  if (explicit !== undefined) return explicit;
  if (type === "DIGITAL" || type === "SUBSCRIPTION") return false;
  return true;
};

const normalizeCreateInput = (input: CreateProductInput): CreateProductInput => ({
  ...input,
  trackInventory: resolveTrackInventoryDefault(input.type, input.trackInventory),
});

const buildImageCreates = (input: CreateProductInput) => {
  if (input.images?.length) {
    return input.images.map((image, index) => ({
      url: image.url,
      altText: image.altText,
      mediaId: image.mediaId ?? null,
      position: image.position ?? index,
    }));
  }
  if (input.primaryImage) {
    return [
      {
        url: input.primaryImage.url,
        altText: input.primaryImage.altText,
        mediaId: input.primaryImage.mediaId ?? null,
        position: 0,
      },
    ];
  }
  return [];
};

const validateCategoryIds = async (storeId: string, categoryIds?: string[]) => {
  if (!categoryIds?.length) return;
  const count = await prisma.category.count({
    where: {
      id: { in: categoryIds },
      storeId,
      deletedAt: null,
      status: "PUBLISHED",
    },
  });
  if (count !== categoryIds.length) {
    throw new AppError(
      400,
      "One or more categories are invalid or not published",
      "INVALID_CATEGORIES",
    );
  }
};

const ensurePublishReady = async (
  storeId: string,
  status: string | undefined,
  categoryIds: string[] | undefined,
  productId?: string,
) => {
  if (status !== "PUBLISHED") return;

  let ids = categoryIds;
  if (ids === undefined && productId) {
    const links = await prisma.productCategory.findMany({
      where: { productId },
      select: { categoryId: true },
    });
    ids = links.map((link) => link.categoryId);
  }

  if (!ids?.length) {
    throw new AppError(
      400,
      "Published products require at least one category",
      "CATEGORIES_REQUIRED",
    );
  }

  await validateCategoryIds(storeId, ids);
};

const assertProductExists = async (productId: string, storeId: string) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new AppError(404, "Product not found", "PRODUCT_NOT_FOUND");
  return product;
};

type ImportRowStatus = "valid" | "imported" | "failed";

interface ImportRowResult {
  row: number;
  slug: string;
  name: string;
  status: ImportRowStatus;
  productId?: string;
  errors: string[];
  fieldErrors?: Partial<Record<ProductImportFieldKey, string>>;
}

const appErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unexpected error";
};

const validateImportRow = async (
  storeId: string,
  input: CreateProductInput,
): Promise<string[]> => {
  const errors: string[] = [];
  const normalized = normalizeCreateInput(input);

  try {
    await validateCategoryIds(storeId, normalized.categoryIds);
  } catch (error) {
    errors.push(appErrorMessage(error));
  }

  try {
    await ensurePublishReady(storeId, normalized.status, normalized.categoryIds);
  } catch (error) {
    errors.push(appErrorMessage(error));
  }

  if (normalized.brandId) {
    const brand = await prisma.brand.findFirst({
      where: { id: normalized.brandId, storeId, deletedAt: null },
      select: { id: true },
    });
    if (!brand) {
      errors.push("Brand not found");
    }
  }

  return errors;
};

const mapValidationErrorsToFields = (
  errors: string[],
): Partial<Record<ProductImportFieldKey, string>> => {
  const fieldErrors: Partial<Record<ProductImportFieldKey, string>> = {};
  for (const error of errors) {
    const lower = error.toLowerCase();
    if (lower.includes("brand")) {
      fieldErrors.brand_slug ??= error;
    } else if (lower.includes("categor")) {
      fieldErrors.category_slugs ??= error;
    } else if (lower.includes("slug")) {
      fieldErrors.slug ??= error;
    } else if (lower.includes("publish")) {
      fieldErrors.status ??= error;
    }
  }
  return fieldErrors;
};

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
    const normalized = normalizeCreateInput(input);

    await validateCategoryIds(storeId, normalized.categoryIds);
    await ensurePublishReady(storeId, normalized.status, normalized.categoryIds);

    const existing = await prisma.product.findFirst({
      where: { storeId, slug: normalized.slug, deletedAt: null },
    });
    if (existing) throw new AppError(409, "Product slug already exists", "PRODUCT_SLUG_EXISTS");

    const imageCreates = buildImageCreates(normalized);

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          storeId,
          name: normalized.name,
          slug: normalized.slug,
          description: normalized.description,
          shortDescription: normalized.shortDescription,
          type: normalized.type,
          status: normalized.status,
          visibility: normalized.visibility,
          brandId: normalized.brandId ?? null,
          featured: normalized.featured ?? false,
          metaTitle: normalized.metaTitle,
          metaDescription: normalized.metaDescription,
          publishedAt: normalized.status === "PUBLISHED" ? new Date() : null,
          categories: normalized.categoryIds?.length
            ? { create: normalized.categoryIds.map((categoryId) => ({ categoryId })) }
            : undefined,
          variants: {
            create: {
              storeId,
              sku: normalized.sku ?? `${normalized.slug}-default`,
              title: normalized.name,
              price: normalized.price ?? 0,
              compareAtPrice: normalized.compareAtPrice,
              status: normalized.status === "ARCHIVED" ? "ARCHIVED" : "PUBLISHED",
              trackInventory: normalized.trackInventory ?? true,
            },
          },
          images: imageCreates.length
            ? { create: imageCreates }
            : undefined,
        },
        select: productSelect,
      });

      const defaultVariant = created.variants[0];
      if (
        defaultVariant &&
        normalized.initialStock &&
        normalized.initialStock > 0 &&
        (normalized.trackInventory ?? true)
      ) {
        await seedInventoryForVariant(tx, storeId, defaultVariant.id, normalized.initialStock);
      }

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

    if (input.categoryIds) {
      await validateCategoryIds(storeId, input.categoryIds);
    }
    await ensurePublishReady(
      storeId,
      input.status ?? existing.status,
      input.categoryIds,
      id,
    );

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

      await syncDefaultVariant(tx, id, storeId, input, input.name ?? updated.name);
      if (input.primaryImage) {
        await syncPrimaryImage(tx, id, input.primaryImage);
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "PRODUCT_UPDATED",
          resource: "product",
          resourceId: id,
          metadata: { changes: Object.keys(input) },
        },
      });

      const refreshed = await tx.product.findFirst({
        where: { id },
        select: productSelect,
      });

      return refreshed ?? updated;
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

  async bulkImport(input: BulkImportProductsInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const slugsInBatch = new Set<string>();
    const results: ImportRowResult[] = [];
    const defaultStatus = input.defaultStatus ?? "DRAFT";

    const [brands, categories] = await Promise.all([
      prisma.brand.findMany({
        where: { storeId, deletedAt: null, status: "PUBLISHED" },
        select: { id: true, slug: true },
      }),
      prisma.category.findMany({
        where: { storeId, deletedAt: null, status: "PUBLISHED" },
        select: { id: true, slug: true },
      }),
    ]);
    const lookup = buildImportLookupMaps(brands, categories);

    const parsedRows = input.products.map((item, index) => ({
      row: item.row ?? index + 1,
      fields: item.fields,
      parsed: parseCsvRowToProduct(item.fields, lookup, defaultStatus),
    }));

    const incomingSlugs = parsedRows
      .map((entry) => entry.parsed.product?.slug)
      .filter((slug): slug is string => Boolean(slug));
    const existingProducts = incomingSlugs.length
      ? await prisma.product.findMany({
          where: { storeId, deletedAt: null, slug: { in: incomingSlugs } },
          select: { slug: true },
        })
      : [];
    const existingSlugSet = new Set(existingProducts.map((product) => product.slug));

    let imported = 0;
    let failed = 0;
    let valid = 0;

    for (const entry of parsedRows) {
      const { row, parsed } = entry;
      const baseResult = { row, slug: parsed.slug, name: parsed.name };

      if (!parsed.product) {
        results.push({
          ...baseResult,
          status: "failed",
          errors: parsed.errors,
          fieldErrors: parsed.fieldErrors,
        });
        failed += 1;
        continue;
      }

      const product = parsed.product;

      if (slugsInBatch.has(product.slug)) {
        results.push({
          ...baseResult,
          status: "failed",
          errors: ["Duplicate slug in import file"],
          fieldErrors: { slug: "Duplicate slug in import file" },
        });
        failed += 1;
        continue;
      }
      slugsInBatch.add(product.slug);

      if (existingSlugSet.has(product.slug)) {
        results.push({
          ...baseResult,
          status: "failed",
          errors: ["Product slug already exists"],
          fieldErrors: { slug: "Product slug already exists" },
        });
        failed += 1;
        continue;
      }

      const validationErrors = await validateImportRow(storeId, product);
      if (validationErrors.length) {
        results.push({
          ...baseResult,
          status: "failed",
          errors: validationErrors,
          fieldErrors: mapValidationErrorsToFields(validationErrors),
        });
        failed += 1;
        continue;
      }

      if (input.dryRun) {
        results.push({
          ...baseResult,
          status: "valid",
          errors: [],
          fieldErrors: {},
        });
        valid += 1;
        continue;
      }

      try {
        const created = await this.create(product, actorId);
        existingSlugSet.add(product.slug);
        results.push({
          ...baseResult,
          status: "imported",
          productId: created.id,
          errors: [],
          fieldErrors: {},
        });
        imported += 1;
      } catch (error) {
        results.push({
          ...baseResult,
          status: "failed",
          errors: [appErrorMessage(error)],
        });
        failed += 1;
      }
    }

    return {
      dryRun: input.dryRun,
      summary: {
        total: input.products.length,
        imported,
        failed,
        valid: input.dryRun ? valid : imported,
      },
      results,
    };
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

  async listImages(productId: string) {
    const storeId = await getDefaultStoreId();
    await assertProductExists(productId, storeId);
    return prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: "asc" },
      select: { id: true, url: true, altText: true, position: true, mediaId: true },
    });
  },

  async addImage(productId: string, input: AddProductImageInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    await assertProductExists(productId, storeId);

    const aggregate = await prisma.productImage.aggregate({
      where: { productId },
      _max: { position: true },
      _count: { id: true },
    });
    if (aggregate._count.id >= 20) {
      throw new AppError(400, "Maximum of 20 images per product", "IMAGE_LIMIT_REACHED");
    }

    const position = input.position ?? (aggregate._max.position ?? -1) + 1;

    return prisma.$transaction(async (tx) => {
      const image = await tx.productImage.create({
        data: {
          productId,
          url: input.url,
          altText: input.altText,
          mediaId: input.mediaId ?? null,
          position,
        },
        select: { id: true, url: true, altText: true, position: true, mediaId: true },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "PRODUCT_IMAGE_ADDED",
          resource: "product_image",
          resourceId: image.id,
          metadata: { productId },
        },
      });

      return image;
    });
  },

  async updateImage(
    productId: string,
    imageId: string,
    input: UpdateProductImageInput,
    actorId?: string,
  ) {
    const storeId = await getDefaultStoreId();
    await assertProductExists(productId, storeId);

    const existing = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!existing) throw new AppError(404, "Product image not found", "PRODUCT_IMAGE_NOT_FOUND");

    return prisma.$transaction(async (tx) => {
      const image = await tx.productImage.update({
        where: { id: imageId },
        data: {
          url: input.url,
          altText: input.altText,
          mediaId: input.mediaId,
          position: input.position,
        },
        select: { id: true, url: true, altText: true, position: true, mediaId: true },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "PRODUCT_IMAGE_UPDATED",
          resource: "product_image",
          resourceId: imageId,
          metadata: { productId },
        },
      });

      return image;
    });
  },

  async deleteImage(productId: string, imageId: string, actorId?: string) {
    const storeId = await getDefaultStoreId();
    await assertProductExists(productId, storeId);

    const existing = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!existing) throw new AppError(404, "Product image not found", "PRODUCT_IMAGE_NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "PRODUCT_IMAGE_DELETED",
          resource: "product_image",
          resourceId: imageId,
          metadata: { productId },
        },
      });
    });
  },

  async reorderImages(productId: string, input: ReorderProductImagesInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    await assertProductExists(productId, storeId);

    const images = await prisma.productImage.findMany({
      where: { productId },
      select: { id: true },
    });
    const existingIds = new Set(images.map((image) => image.id));
    if (
      input.imageIds.length !== images.length ||
      input.imageIds.some((id) => !existingIds.has(id))
    ) {
      throw new AppError(400, "Image order must include all product images", "INVALID_IMAGE_ORDER");
    }

    await prisma.$transaction(async (tx) => {
      for (const [position, imageId] of input.imageIds.entries()) {
        await tx.productImage.update({
          where: { id: imageId },
          data: { position },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "PRODUCT_IMAGES_REORDERED",
          resource: "product",
          resourceId: productId,
        },
      });
    });

    return this.listImages(productId);
  },
};
