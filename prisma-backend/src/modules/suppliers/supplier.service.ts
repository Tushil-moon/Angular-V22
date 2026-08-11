import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreateSupplierInput,
  ListSuppliersQuery,
  UpdateSupplierInput,
} from "./supplier.validation";

const supplierSelect = {
  id: true,
  storeId: true,
  name: true,
  code: true,
  email: true,
  phone: true,
  website: true,
  contactName: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

export const supplierService = {
  async list(query: ListSuppliersQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SupplierWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.SupplierOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      name: { name: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.supplier.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: supplierSelect,
      }),
      prisma.supplier.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const supplier = await prisma.supplier.findFirst({
      where: { id, storeId, deletedAt: null },
      select: supplierSelect,
    });
    if (!supplier) throw new AppError(404, "Supplier not found", "SUPPLIER_NOT_FOUND");
    return supplier;
  },

  async create(input: CreateSupplierInput) {
    const storeId = await getDefaultStoreId();

    if (input.code) {
      const existing = await prisma.supplier.findFirst({
        where: { storeId, code: input.code, deletedAt: null },
      });
      if (existing) throw new AppError(409, "Supplier code already exists", "SUPPLIER_CODE_EXISTS");
    }

    return prisma.supplier.create({
      data: {
        storeId,
        name: input.name,
        code: input.code ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        website: input.website ?? null,
        contactName: input.contactName ?? null,
        notes: input.notes ?? null,
      },
      select: supplierSelect,
    });
  },

  async update(id: string, input: UpdateSupplierInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.supplier.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Supplier not found", "SUPPLIER_NOT_FOUND");

    if (input.code && input.code !== existing.code) {
      const codeTaken = await prisma.supplier.findFirst({
        where: { storeId, code: input.code, deletedAt: null, NOT: { id } },
      });
      if (codeTaken) throw new AppError(409, "Supplier code already exists", "SUPPLIER_CODE_EXISTS");
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        name: input.name,
        code: input.code === undefined ? undefined : input.code,
        email: input.email === undefined ? undefined : input.email,
        phone: input.phone === undefined ? undefined : input.phone,
        website: input.website === undefined ? undefined : input.website,
        contactName: input.contactName === undefined ? undefined : input.contactName,
        notes: input.notes === undefined ? undefined : input.notes,
      },
      select: supplierSelect,
    });
  },

  async remove(id: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.supplier.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Supplier not found", "SUPPLIER_NOT_FOUND");

    await prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
