import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListActivitiesQuery } from "./activity.validation";
import { activityService } from "./activity.service";

export const listActivities = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListActivitiesQuery>(req);
  const result = await activityService.listActivities(query);
  return sendSuccess(res, result);
});

export const createActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.createActivity(req.body, req.user!.id);
  return sendCreated(res, activity, "Activity logged");
});
