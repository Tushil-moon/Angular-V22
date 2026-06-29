import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./activity.controller";
import {
  activityIdParamSchema,
  createActivitySchema,
  listActivitiesQuerySchema,
  updateActivitySchema,
} from "./activity.validation";

export const activityRouter = Router();

const canRead = requirePermission(Permissions.ReadActivities);
const canManage = requirePermission(Permissions.ManageActivities);

activityRouter.use(authenticate, resolveOrganization);

activityRouter.get(
  "/",
  canRead,
  validate({ query: listActivitiesQuerySchema }),
  controller.listActivities,
);
activityRouter.post(
  "/",
  canManage,
  validate({ body: createActivitySchema }),
  controller.createActivity,
);
activityRouter.get(
  "/:id",
  canRead,
  validate({ params: activityIdParamSchema }),
  controller.getActivity,
);
activityRouter.patch(
  "/:id",
  canManage,
  validate({ params: activityIdParamSchema, body: updateActivitySchema }),
  controller.updateActivity,
);
activityRouter.delete(
  "/:id",
  canManage,
  validate({ params: activityIdParamSchema }),
  controller.deleteActivity,
);
