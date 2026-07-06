import type { Prisma } from "@prisma/client";
import { createHmac } from "node:crypto";

import { prisma } from "../../config/prisma";
import { webhookDeliverySelect, webhookSelect } from "../../shared/utils/automation-mapper";

export const webhookRepository = {
  findMany(where: Prisma.WebhookWhereInput, skip: number, take: number) {
    return prisma.webhook.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: webhookSelect,
    });
  },

  count(where: Prisma.WebhookWhereInput) {
    return prisma.webhook.count({ where });
  },

  findById(where: Prisma.WebhookWhereInput) {
    return prisma.webhook.findFirst({ where, select: webhookSelect });
  },

  findByIdWithSecret(id: string, organizationId: string) {
    return prisma.webhook.findFirst({ where: { id, organizationId } });
  },

  findActiveByEvent(organizationId: string, event: string) {
    return prisma.webhook.findMany({
      where: { organizationId, active: true, events: { has: event } },
    });
  },

  create(data: Prisma.WebhookCreateInput) {
    return prisma.webhook.create({ data, select: webhookSelect });
  },

  update(id: string, data: Prisma.WebhookUpdateInput) {
    return prisma.webhook.update({ where: { id }, data, select: webhookSelect });
  },

  delete(id: string) {
    return prisma.webhook.delete({ where: { id } });
  },

  createDelivery(data: Prisma.WebhookDeliveryCreateInput) {
    return prisma.webhookDelivery.create({ data, select: { id: true } });
  },

  findDeliverySelectById(id: string) {
    return prisma.webhookDelivery.findUnique({ where: { id }, select: webhookDeliverySelect });
  },

  findDeliveryById(id: string) {
    return prisma.webhookDelivery.findUnique({
      where: { id },
      include: { webhook: true },
    });
  },

  listDeliveries(webhookId: string, skip: number, take: number) {
    return prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: webhookDeliverySelect,
    });
  },

  countDeliveries(webhookId: string) {
    return prisma.webhookDelivery.count({ where: { webhookId } });
  },

  updateDelivery(id: string, data: Prisma.WebhookDeliveryUpdateInput) {
    return prisma.webhookDelivery.update({ where: { id }, data, select: webhookDeliverySelect });
  },
};

export const signWebhookPayload = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");
