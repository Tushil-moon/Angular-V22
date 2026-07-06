import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { productSelect } from "../../shared/utils/quote-mapper";

export const productRepository = {
  findMany(where: Prisma.ProductWhereInput, skip: number, take: number) {
    return prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: productSelect,
    });
  },

  count(where: Prisma.ProductWhereInput) {
    return prisma.product.count({ where });
  },

  findById(where: Prisma.ProductWhereInput) {
    return prisma.product.findFirst({ where, select: productSelect });
  },

  findBySku(organizationId: string, sku: string) {
    return prisma.product.findFirst({
      where: { organizationId, sku },
      select: productSelect,
    });
  },

  create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({ data, select: productSelect });
  },

  update(id: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.update({ where: { id }, data, select: productSelect });
  },

  delete(id: string) {
    return prisma.product.delete({ where: { id } });
  },
};
