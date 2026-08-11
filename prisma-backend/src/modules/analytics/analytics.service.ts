import { prisma } from "../../config/prisma";
import { getDefaultStoreId } from "../../shared/utils/store";
import type { AnalyticsQuery } from "./analytics.validation";

const resolveRange = (query: AnalyticsQuery) => {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
};

export const analyticsService = {
  async dashboard(query: AnalyticsQuery) {
    const storeId = await getDefaultStoreId();
    const { from, to } = resolveRange(query);

    const [
      orderCount,
      revenueAgg,
      customerCount,
      productCount,
      lowStockCount,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count({
        where: { storeId, createdAt: { gte: from, lte: to }, deletedAt: null },
      }),
      prisma.order.aggregate({
        where: {
          storeId,
          createdAt: { gte: from, lte: to },
          deletedAt: null,
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
    ]);

    return {
      range: { from, to },
      kpis: {
        orders: orderCount,
        revenue: revenueAgg._sum.grandTotal ?? 0,
        averageOrderValue: revenueAgg._avg.grandTotal ?? 0,
        newCustomers: customerCount,
        products: productCount,
        lowStockItems: lowStockCount,
      },
      recentOrders,
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
