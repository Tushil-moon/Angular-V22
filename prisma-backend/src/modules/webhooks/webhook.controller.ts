import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListWebhookDeliveriesQuery, ListWebhooksQuery } from "./webhook.validation";
import { webhookService } from "./webhook.service";

export const listWebhooks = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListWebhooksQuery>(req);
  const result = await webhookService.listWebhooks(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getWebhook = asyncHandler(async (req, res) => {
  const item = await webhookService.getWebhookById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createWebhook = asyncHandler(async (req, res) => {
  const item = await webhookService.createWebhook(req.body, getAuthContext(req));
  return sendCreated(res, item, "Webhook created");
});

export const updateWebhook = asyncHandler(async (req, res) => {
  const item = await webhookService.updateWebhook(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Webhook updated");
});

export const deleteWebhook = asyncHandler(async (req, res) => {
  await webhookService.deleteWebhook(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Webhook deleted");
});

export const listDeliveries = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListWebhookDeliveriesQuery>(req);
  const result = await webhookService.listDeliveries(String(req.params.id), query, getAuthContext(req));
  return sendSuccess(res, result);
});
