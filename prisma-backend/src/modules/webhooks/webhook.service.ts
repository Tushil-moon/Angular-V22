import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { randomToken, sha256 } from "../../shared/utils/crypto";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type {
  CreateWebhookInput,
  ListWebhookDeliveriesQuery,
  ListWebhooksQuery,
  UpdateWebhookInput,
} from "./webhook.validation";

export const webhookService = {
  async listWebhooks(query: ListWebhooksQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = {
      organizationId,
      ...(query.active !== undefined ? { active: query.active } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.webhook.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: query.pageSize,
        select: { id: true, organizationId: true, url: true, events: true, active: true, createdAt: true, updatedAt: true },
      }),
      prisma.webhook.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getWebhookById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.webhook.findFirst({
      where: { id, organizationId },
      select: { id: true, organizationId: true, url: true, events: true, active: true, createdAt: true, updatedAt: true },
    });
    if (!item) throw new AppError(404, "Webhook not found", "WEBHOOK_NOT_FOUND");
    return item;
  },

  async createWebhook(input: CreateWebhookInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const secret = input.secret ?? randomToken(32);
    return prisma.webhook.create({
      data: {
        organizationId,
        url: input.url,
        events: input.events,
        secret: sha256(secret),
        active: input.active ?? true,
      },
      select: { id: true, organizationId: true, url: true, events: true, active: true, createdAt: true, updatedAt: true },
    });
  },

  async updateWebhook(id: string, input: UpdateWebhookInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.webhook.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Webhook not found", "WEBHOOK_NOT_FOUND");
    const { secret, ...rest } = input;
    return prisma.webhook.update({
      where: { id },
      data: {
        ...rest,
        ...(secret !== undefined ? { secret: sha256(secret) } : {}),
      },
      select: { id: true, organizationId: true, url: true, events: true, active: true, createdAt: true, updatedAt: true },
    });
  },

  async deleteWebhook(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.webhook.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Webhook not found", "WEBHOOK_NOT_FOUND");
    await prisma.webhook.delete({ where: { id } });
  },

  async listDeliveries(webhookId: string, query: ListWebhookDeliveriesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const webhook = await prisma.webhook.findFirst({ where: { id: webhookId, organizationId } });
    if (!webhook) throw new AppError(404, "Webhook not found", "WEBHOOK_NOT_FOUND");
    const where = { webhookId };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.webhookDelivery.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: query.pageSize }),
      prisma.webhookDelivery.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },
};
