import { logger } from "../../config/logger";
import { enqueueJob } from "../../shared/jobs/job-queue";
import { signWebhookPayload, webhookRepository } from "./webhook.repository";
import { deliveryBackoffMs, shouldRetryDelivery } from "./webhook.utils";

export const dispatchWebhookDelivery = async (deliveryId: string) => {
  const delivery = await webhookRepository.findDeliveryById(deliveryId);
  if (!delivery) return;

  const payload = JSON.stringify(delivery.payload ?? {});
  const signature = signWebhookPayload(delivery.webhook.secret, payload);
  const attempt = delivery.attempts + 1;

  try {
    const response = await fetch(delivery.webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": delivery.event,
        "X-Webhook-Signature": `sha256=${signature}`,
      },
      body: payload,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    await webhookRepository.updateDelivery(deliveryId, {
      status: "DELIVERED",
      attempts: attempt,
      responseStatus: response.status,
      lastAttemptAt: new Date(),
      completedAt: new Date(),
      errorMessage: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delivery failed";
    logger.warn({ deliveryId, attempt, message }, "Webhook delivery failed");

    if (shouldRetryDelivery(attempt)) {
      await webhookRepository.updateDelivery(deliveryId, {
        status: "PENDING",
        attempts: attempt,
        errorMessage: message,
        lastAttemptAt: new Date(),
      });

      const delay = deliveryBackoffMs(attempt);
      setTimeout(() => {
        enqueueJob(`webhook-retry:${deliveryId}`, () => dispatchWebhookDelivery(deliveryId));
      }, delay);
      return;
    }

    await webhookRepository.updateDelivery(deliveryId, {
      status: "FAILED",
      attempts: attempt,
      errorMessage: message,
      lastAttemptAt: new Date(),
      completedAt: new Date(),
    });
  }
};
