import { prisma } from "../../config/prisma";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { AnalyticsQuery } from "./analytics.validation";

const resolveRange = (query: AnalyticsQuery) => {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from, to };
};

const previousRange = (from: Date, to: Date) => {
  const spanMs = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - spanMs);
  return { from: prevFrom, to: prevTo };
};

export const analyticsService = {
  async dashboard(query: AnalyticsQuery) {
    const storeId = await getDefaultStoreId();
    const { from, to } = resolveRange(query);
    const prev = previousRange(from, to);

    const baseWhere = {
      storeId,
      deletedAt: null as Date | null,
      createdAt: { gte: from, lte: to },
    };

    const prevWhere = {
      storeId,
      deletedAt: null as Date | null,
      createdAt: { gte: prev.from, lte: prev.to },
    };

    const [
      orderCount,
      revenueAgg,
      customerCount,
      productCount,
      lowStockCount,
      recentOrders,
      pendingOrders,
      cancelledOrders,
      completedOrders,
      prevOrderCount,
      prevRevenueAgg,
      prevPendingOrders,
      prevCancelledOrders,
      prevCompletedOrders,
      topProductRows,
      countryRows,
    ] = await Promise.all([
      prisma.order.count({ where: baseWhere }),
      prisma.order.aggregate({
        where: {
          ...baseWhere,
          status: { notIn: ["CANCELLED"] },
        },
        _sum: { grandTotal: true },
        _avg: { grandTotal: true },
      }),
      prisma.customer.count({
        where: { storeId, createdAt: { gte: from, lte: to }, deletedAt: null },
      }),
      prisma.product.count({ where: { storeId, deletedAt: null } }),
      prisma.inventoryItem.count({
        where: { storeId, quantityAvailable: { lte: 5 } },
      }),
      prisma.order.findMany({
        where: { storeId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          currencyCode: true,
          createdAt: true,
          customerEmail: true,
        },
      }),
      prisma.order.count({
        where: {
          ...baseWhere,
          OR: [{ status: "PENDING" }, { paymentStatus: "PENDING" }],
        },
      }),
      prisma.order.count({
        where: { ...baseWhere, status: "CANCELLED" },
      }),
      prisma.order.count({
        where: {
          ...baseWhere,
          status: { in: ["COMPLETED", "DELIVERED"] },
        },
      }),
      prisma.order.count({ where: prevWhere }),
      prisma.order.aggregate({
        where: {
          ...prevWhere,
          status: { notIn: ["CANCELLED"] },
        },
        _sum: { grandTotal: true },
      }),
      prisma.order.count({
        where: {
          ...prevWhere,
          OR: [{ status: "PENDING" }, { paymentStatus: "PENDING" }],
        },
      }),
      prisma.order.count({
        where: { ...prevWhere, status: "CANCELLED" },
      }),
      prisma.order.count({
        where: {
          ...prevWhere,
          status: { in: ["COMPLETED", "DELIVERED"] },
        },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: {
            storeId,
            deletedAt: null,
            createdAt: { gte: from, lte: to },
            status: { notIn: ["CANCELLED"] },
          },
          productId: { not: null },
        },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
      prisma.orderAddress.groupBy({
        by: ["countryCode"],
        where: {
          type: { in: ["SHIPPING", "BOTH"] },
          order: {
            storeId,
            deletedAt: null,
            createdAt: { gte: from, lte: to },
            status: { notIn: ["CANCELLED"] },
          },
        },
        _count: { orderId: true },
      }),
    ]);

    const productIds = topProductRows
      .map((row) => row.productId)
      .filter((id): id is string => id != null);

    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds }, deletedAt: null },
            select: {
              id: true,
              name: true,
              status: true,
              images: {
                take: 1,
                orderBy: { position: "asc" },
                select: { url: true },
              },
              variants: {
                take: 1,
                orderBy: { position: "asc" },
                select: { sku: true, price: true },
              },
            },
          })
        : [];

    const productMap = new Map(products.map((p) => [p.id, p]));

    const topProducts = topProductRows
      .filter((row) => row.productId != null)
      .map((row) => {
        const product = productMap.get(row.productId!);
        const variant = product?.variants[0];
        return {
          id: row.productId!,
          name: product?.name ?? "Unknown product",
          sku: variant?.sku ?? "",
          imageUrl: product?.images[0]?.url ?? null,
          status: product?.status ?? "DRAFT",
          totalSold: row._sum.quantity ?? 0,
          revenue: row._sum.lineTotal ?? 0,
          price: variant?.price ?? null,
        };
      });

    const countryOrderIds = await prisma.orderAddress.findMany({
      where: {
        type: { in: ["SHIPPING", "BOTH"] },
        countryCode: { in: countryRows.map((r) => r.countryCode) },
        order: {
          storeId,
          deletedAt: null,
          createdAt: { gte: from, lte: to },
          status: { notIn: ["CANCELLED"] },
        },
      },
      select: {
        countryCode: true,
        order: { select: { grandTotal: true } },
      },
    });

    const revenueByCountry = new Map<string, number>();
    for (const row of countryOrderIds) {
      const current = revenueByCountry.get(row.countryCode) ?? 0;
      revenueByCountry.set(row.countryCode, current + Number(row.order.grandTotal));
    }

    const salesByCountry = countryRows
      .map((row) => ({
        countryCode: row.countryCode,
        orderCount: row._count.orderId,
        revenue: revenueByCountry.get(row.countryCode) ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      range: { from, to },
      kpis: {
        orders: orderCount,
        revenue: revenueAgg._sum.grandTotal ?? 0,
        averageOrderValue: revenueAgg._avg.grandTotal ?? 0,
        newCustomers: customerCount,
        products: productCount,
        lowStockItems: lowStockCount,
        pendingOrders,
        cancelledOrders,
        completedOrders,
        previousPeriodRevenue: prevRevenueAgg._sum.grandTotal ?? 0,
        previousPeriodOrders: prevOrderCount,
        previousPeriodPendingOrders: prevPendingOrders,
        previousPeriodCancelledOrders: prevCancelledOrders,
        previousPeriodCompletedOrders: prevCompletedOrders,
      },
      recentOrders,
      topProducts,
      salesByCountry,
    };
  },

  async revenue(query: AnalyticsQuery) {
    const storeId = await getDefaultStoreId();
    const { from, to } = resolveRange(query);
    const orders = await prisma.order.findMany({
      where: {
        storeId,
        createdAt: { gte: from, lte: to },
        deletedAt: null,
        status: { notIn: ["CANCELLED"] },
      },
      select: { createdAt: true, grandTotal: true },
      orderBy: { createdAt: "asc" },
    });

    const byDay = new Map<string, number>();
    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + Number(order.grandTotal));
    }

    return {
      range: { from, to },
      series: [...byDay.entries()].map(([date, total]) => ({ date, total })),
    };
  },
};
