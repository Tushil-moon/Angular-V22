import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./notification.controller";
import {
  createTemplateSchema,
  listNotificationsQuerySchema,
  listTemplatesQuerySchema,
  notificationIdParamSchema,
  templateIdParamSchema,
  updateTemplateSchema,
} from "./notification.validation";

export const notificationRouter = Router();

const canRead = requirePermission(Permissions.ReadNotifications, Permissions.ManageNotifications);
const canManage = requirePermission(Permissions.ManageNotifications);

notificationRouter.use(authenticate);

notificationRouter.get(
  "/",
  canRead,
  validate({ query: listNotificationsQuerySchema }),
  controller.listNotifications,
);
notificationRouter.patch("/read-all", canRead, controller.markAllNotificationsRead);

notificationRouter.get(
  "/templates",
  canRead,
  validate({ query: listTemplatesQuerySchema }),
  controller.listTemplates,
);
notificationRouter.post(
  "/templates",
  canManage,
  validate({ body: createTemplateSchema }),
  controller.createTemplate,
);
notificationRouter.patch(
  "/templates/:id",
  canManage,
  validate({ params: templateIdParamSchema, body: updateTemplateSchema }),
  controller.updateTemplate,
);

notificationRouter.patch(
  "/:id/read",
  canRead,
  validate({ params: notificationIdParamSchema }),
  controller.markNotificationRead,
);
