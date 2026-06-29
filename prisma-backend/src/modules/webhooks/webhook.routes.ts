import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./webhook.controller";
import {
  createWebhookSchema,
  listWebhookDeliveriesQuerySchema,
  listWebhooksQuerySchema,
  updateWebhookSchema,
  webhookIdParamSchema,
} from "./webhook.validation";

export const webhookRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

webhookRouter.use(authenticate, resolveOrganization);

webhookRouter.get("/", canRead, validate({ query: listWebhooksQuerySchema }), controller.listWebhooks);
webhookRouter.post("/", canManage, validate({ body: createWebhookSchema }), controller.createWebhook);
webhookRouter.get("/:id/deliveries", canRead, validate({ params: webhookIdParamSchema, query: listWebhookDeliveriesQuerySchema }), controller.listDeliveries);
webhookRouter.get("/:id", canRead, validate({ params: webhookIdParamSchema }), controller.getWebhook);
webhookRouter.patch(
  "/:id",
  canManage,
  validate({ params: webhookIdParamSchema, body: updateWebhookSchema }),
  controller.updateWebhook,
);
webhookRouter.delete("/:id", canManage, validate({ params: webhookIdParamSchema }), controller.deleteWebhook);
