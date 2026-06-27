import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListActivitiesQuery } from "./activity.validation";
import { activityService } from "./activity.service";

export const listActivities = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListActivitiesQuery>(req);
  const result = await activityService.listActivities(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const createActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.createActivity(req.body, getAuthContext(req));
  return sendCreated(res, activity, "Activity logged");
});

export const updateActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.updateActivity(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, activity, "Activity updated");
});

export const deleteActivity = asyncHandler(async (req, res) => {
  await activityService.deleteActivity(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Activity deleted");
});
