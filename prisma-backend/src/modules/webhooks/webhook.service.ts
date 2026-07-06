import { AppError } from "../../shared/errors/app-error";
import { mapWebhook, mapWebhookDelivery } from "../../shared/utils/automation-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { randomToken } from "../../shared/utils/crypto";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { enqueueJob } from "../../shared/jobs/job-queue";
import { dispatchWebhookDelivery } from "./webhook.dispatcher";
import { webhookRepository } from "./webhook.repository";
import { buildWebhookListWhere } from "./webhook.utils";
import type {
  CreateWebhookInput,
  ListWebhookDeliveriesQuery,
  ListWebhooksQuery,
  UpdateWebhookInput,
} from "./webhook.validation";

export const webhookService = {
  async listWebhooks(query: ListWebhooksQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildWebhookListWhere(organizationId, query.active);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      webhookRepository.findMany(where, skip, query.pageSize),
      webhookRepository.count(where),
    ]);
    return { data: data.map(mapWebhook), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getWebhookById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await webhookRepository.findById({ id, organizationId });
    if (!item) throw new AppError(404, "Webhook not found", "WEBHOOK_NOT_FOUND");
    return mapWebhook(item);
  },

  async createWebhook(input: CreateWebhookInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const secret = input.secret ?? randomToken(32);
    const item = await webhookRepository.create({
      organization: { connect: { id: organizationId } },
      url: input.url,
      events: input.events,
      secret,
      active: input.active ?? true,
    });
    return mapWebhook(item);
  },

  async updateWebhook(id: string, input: UpdateWebhookInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await webhookRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Webhook not found", "WEBHOOK_NOT_FOUND");

    const item = await webhookRepository.update(id, {
      url: input.url,
      events: input.events,
      active: input.active,
      ...(input.secret ? { secret: input.secret } : {}),
    });
    return mapWebhook(item);
  },

  async deleteWebhook(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await webhookRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Webhook not found", "WEBHOOK_NOT_FOUND");
    await webhookRepository.delete(id);
  },

  async listDeliveries(webhookId: string, query: ListWebhookDeliveriesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const webhook = await webhookRepository.findById({ id: webhookId, organizationId });
    if (!webhook) throw new AppError(404, "Webhook not found", "WEBHOOK_NOT_FOUND");

    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      webhookRepository.listDeliveries(webhookId, skip, query.pageSize),
      webhookRepository.countDeliveries(webhookId),
    ]);
    return { data: data.map(mapWebhookDelivery), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async testWebhook(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const webhook = await webhookRepository.findByIdWithSecret(id, organizationId);
    if (!webhook) throw new AppError(404, "Webhook not found", "WEBHOOK_NOT_FOUND");

    const delivery = await webhookRepository.createDelivery({
      webhook: { connect: { id: webhook.id } },
      event: "webhook.test",
      payload: {
        event: "webhook.test",
        organizationId,
        data: { message: "Test delivery from CRM" },
        timestamp: new Date().toISOString(),
      },
    });

    enqueueJob(`webhook-test:${delivery.id}`, () => dispatchWebhookDelivery(delivery.id));

    const [item] = await webhookRepository.listDeliveries(webhook.id, 0, 1);
    return mapWebhookDelivery(item);
  },

  async retryDelivery(webhookId: string, deliveryId: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const webhook = await webhookRepository.findById({ id: webhookId, organizationId });
    if (!webhook) throw new AppError(404, "Webhook not found", "WEBHOOK_NOT_FOUND");

    const delivery = await webhookRepository.findDeliveryById(deliveryId);
    if (!delivery || delivery.webhookId !== webhookId) {
      throw new AppError(404, "Delivery not found", "WEBHOOK_DELIVERY_NOT_FOUND");
    }

    await webhookRepository.updateDelivery(deliveryId, { status: "PENDING", errorMessage: null });
    enqueueJob(`webhook-retry:${deliveryId}`, () => dispatchWebhookDelivery(deliveryId));

    const item = await webhookRepository.findDeliverySelectById(deliveryId);
    if (!item) throw new AppError(404, "Delivery not found", "WEBHOOK_DELIVERY_NOT_FOUND");
    return mapWebhookDelivery(item);
  },
};
