import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreateCustomerInput,
  ListCustomerOrdersQuery,
  ListCustomersQuery,
  UpdateCustomerInput,
} from "./customer.validation";

const customerSelect = {
  id: true,
  storeId: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  status: true,
  acceptsMarketing: true,
  notes: true,
  totalOrders: true,
  totalSpent: true,
  averageOrderValue: true,
  lifetimeValue: true,
  lastOrderAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomerSelect;

export const customerService = {
  async list(query: ListCustomersQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search, mode: "insensitive" } },
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.CustomerOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      email: { email: query.order },
      last_order_at: { lastOrderAt: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: customerSelect,
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      data: items,
      ...buildPaginationMeta(total, page, pageSize),
    };
  },

  async getById(id: string) {
    const storeId = await getDefaultStoreId();
    const customer = await prisma.customer.findFirst({
      where: { id, storeId, deletedAt: null },
      select: {
        ...customerSelect,
        addresses: {
          where: { deletedAt: null },
          select: {
            id: true,
            type: true,
            label: true,
            firstName: true,
            lastName: true,
            company: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            postalCode: true,
            countryCode: true,
            phone: true,
            isDefault: true,
          },
          take: 50,
        },
      },
    });
    if (!customer) throw new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");
    return customer;
  },

  async create(input: CreateCustomerInput, actorId?: string) {
    const storeId = await getDefaultStoreId();

    if (input.email) {
      const existing = await prisma.customer.findFirst({
        where: { storeId, email: input.email, deletedAt: null },
      });
      if (existing) throw new AppError(409, "Customer email already exists", "CUSTOMER_EMAIL_EXISTS");
    }

    return prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          storeId,
          email: input.email,
          phone: input.phone,
          firstName: input.firstName,
          lastName: input.lastName,
          status: input.status,
          acceptsMarketing: input.acceptsMarketing ?? false,
          notes: input.notes,
        },
        select: customerSelect,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "CUSTOMER_CREATED",
          resource: "customer",
          resourceId: created.id,
          metadata: { email: created.email },
        },
      });

      return created;
    });
  },

  async update(id: string, input: UpdateCustomerInput, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.customer.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");

    if (input.email && input.email !== existing.email) {
      const emailTaken = await prisma.customer.findFirst({
        where: { storeId, email: input.email, deletedAt: null, NOT: { id } },
      });
      if (emailTaken) throw new AppError(409, "Customer email already exists", "CUSTOMER_EMAIL_EXISTS");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id },
        data: {
          email: input.email,
          phone: input.phone,
          firstName: input.firstName,
          lastName: input.lastName,
          status: input.status,
          acceptsMarketing: input.acceptsMarketing,
          notes: input.notes,
        },
        select: customerSelect,
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "CUSTOMER_UPDATED",
          resource: "customer",
          resourceId: id,
          metadata: { changes: Object.keys(input) },
        },
      });

      return updated;
    });
  },

  async remove(id: string, actorId?: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.customer.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: { deletedAt: new Date(), status: "INACTIVE" },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: "CUSTOMER_UPDATED",
          resource: "customer",
          resourceId: id,
          metadata: { softDeleted: true },
        },
      });
    });
  },

  async listOrders(customerId: string, query: ListCustomerOrdersQuery) {
    const storeId = await getDefaultStoreId();
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, storeId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) throw new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");

    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.OrderWhereInput = {
      storeId,
      customerId,
      deletedAt: null,
    };

    const [items, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          fulfillmentStatus: true,
          paymentStatus: true,
          grandTotal: true,
          currencyCode: true,
          placedAt: true,
          createdAt: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: items,
      ...buildPaginationMeta(total, page, pageSize),
    };
  },
};
