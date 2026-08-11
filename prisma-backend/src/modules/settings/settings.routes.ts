import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./settings.controller";
import { updateStoreSettingsSchema } from "./settings.validation";

export const settingsRouter = Router();

const canManage = requirePermission(Permissions.ManageSettings);

settingsRouter.use(authenticate);

settingsRouter.get("/store", canManage, controller.getStoreSettings);
settingsRouter.patch(
  "/store",
  canManage,
  validate({ body: updateStoreSettingsSchema }),
  controller.updateStoreSettings,
);
