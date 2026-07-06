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
  importActivitiesCsvSchema,
  listActivitiesQuerySchema,
  timelineQuerySchema,
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
activityRouter.get(
  "/timeline",
  canRead,
  validate({ query: timelineQuerySchema }),
  controller.getTimeline,
);
activityRouter.get(
  "/export",
  canRead,
  validate({ query: listActivitiesQuerySchema }),
  controller.exportActivities,
);
activityRouter.post(
  "/import/csv",
  canManage,
  validate({ body: importActivitiesCsvSchema }),
  controller.importActivitiesCsv,
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
activityRouter.get(
  "/:id/history",
  canRead,
  validate({ params: activityIdParamSchema }),
  controller.getActivityHistory,
);
activityRouter.patch(
  "/:id",
  canManage,
  validate({ params: activityIdParamSchema, body: updateActivitySchema }),
  controller.updateActivity,
);
activityRouter.post(
  "/:id/complete",
  canManage,
  validate({ params: activityIdParamSchema }),
  controller.completeActivity,
);
activityRouter.post(
  "/:id/reopen",
  canManage,
  validate({ params: activityIdParamSchema }),
  controller.reopenActivity,
);
activityRouter.post(
  "/:id/cancel",
  canManage,
  validate({ params: activityIdParamSchema }),
  controller.cancelActivity,
);
activityRouter.delete(
  "/:id",
  canManage,
  validate({ params: activityIdParamSchema }),
  controller.deleteActivity,
);
