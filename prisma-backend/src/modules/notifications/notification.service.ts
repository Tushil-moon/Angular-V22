import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreateTemplateInput,
  ListNotificationsQuery,
  ListTemplatesQuery,
  UpdateTemplateInput,
} from "./notification.validation";

const notificationSelect = {
  id: true,
  storeId: true,
  userId: true,
  customerId: true,
  channel: true,
  status: true,
  title: true,
  body: true,
  data: true,
  sentAt: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

const templateSelect = {
  id: true,
  storeId: true,
  code: true,
  name: true,
  channel: true,
  subject: true,
  body: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NotificationTemplateSelect;

export const notificationService = {
  async listForUser(userId: string, query: ListNotificationsQuery) {
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: query.order },
        select: notificationSelect,
      }),
      prisma.notification.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async markRead(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new AppError(404, "Notification not found", "NOTIFICATION_NOT_FOUND");

    if (notification.readAt) {
      return prisma.notification.findFirst({
        where: { id },
        select: notificationSelect,
      });
    }

    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date(), status: "READ" },
      select: notificationSelect,
    });
  },

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date(), status: "READ" },
    });
    return { updatedCount: result.count };
  },

  async listTemplates(query: ListTemplatesQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationTemplateWhereInput = {
      storeId,
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { code: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.NotificationTemplateOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      name: { name: query.order },
      code: { code: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.notificationTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: templateSelect,
      }),
      prisma.notificationTemplate.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async createTemplate(input: CreateTemplateInput) {
    const storeId = await getDefaultStoreId();

    const existing = await prisma.notificationTemplate.findFirst({
      where: { storeId, code: input.code, channel: input.channel },
    });
    if (existing) {
      throw new AppError(409, "Notification template already exists", "NOTIFICATION_TEMPLATE_EXISTS");
    }

    return prisma.notificationTemplate.create({
      data: {
        storeId,
        code: input.code,
        name: input.name,
        channel: input.channel,
        subject: input.subject ?? null,
        body: input.body,
        enabled: input.enabled ?? true,
      },
      select: templateSelect,
    });
  },

  async updateTemplate(id: string, input: UpdateTemplateInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.notificationTemplate.findFirst({
      where: { id, storeId },
    });
    if (!existing) {
      throw new AppError(404, "Notification template not found", "NOTIFICATION_TEMPLATE_NOT_FOUND");
    }

    const nextCode = input.code ?? existing.code;
    const nextChannel = input.channel ?? existing.channel;
    if (nextCode !== existing.code || nextChannel !== existing.channel) {
      const conflict = await prisma.notificationTemplate.findFirst({
        where: { storeId, code: nextCode, channel: nextChannel, NOT: { id } },
      });
      if (conflict) {
        throw new AppError(409, "Notification template already exists", "NOTIFICATION_TEMPLATE_EXISTS");
      }
    }

    return prisma.notificationTemplate.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        channel: input.channel,
        subject: input.subject === undefined ? undefined : input.subject,
        body: input.body,
        enabled: input.enabled,
      },
      select: templateSelect,
    });
  },
};
