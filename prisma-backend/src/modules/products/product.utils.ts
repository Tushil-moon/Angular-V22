import type { Prisma } from "@prisma/client";

import type { ListProductsQuery } from "./product.validation";

export const buildProductListWhere = (
  query: ListProductsQuery,
  organizationId: string,
): Prisma.ProductWhereInput => {
  const filters: Prisma.ProductWhereInput = { organizationId };

  if (query.status) filters.status = query.status;

  const search = query.search?.trim();
  if (search) {
    filters.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  return filters;
};
