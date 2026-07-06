import { DOMAIN_EVENTS } from "../../shared/events/domain-events";

export const WEBHOOK_EVENTS = DOMAIN_EVENTS;

export const buildWebhookListWhere = (
  organizationId: string,
  active?: boolean,
) => ({
  organizationId,
  ...(active !== undefined ? { active } : {}),
});

export const shouldRetryDelivery = (attempts: number, maxAttempts = 3) => attempts < maxAttempts;

export const deliveryBackoffMs = (attempts: number) => Math.min(60_000, 1000 * 2 ** attempts);
