import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as controller from "./activity.controller";
import { createActivitySchema, listActivitiesQuerySchema } from "./activity.validation";

export const activityRouter = Router();

activityRouter.get(
  "/",
  authenticate,
  validate({ query: listActivitiesQuerySchema }),
  controller.listActivities,
);
activityRouter.post(
  "/",
  authenticate,
  validate({ body: createActivitySchema }),
  controller.createActivity,
);
