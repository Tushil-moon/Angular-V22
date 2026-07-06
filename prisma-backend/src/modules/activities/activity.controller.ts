import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListActivitiesQuery, TimelineQuery } from "./activity.validation";
import { activityService } from "./activity.service";

export const listActivities = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListActivitiesQuery>(req);
  const result = await activityService.listActivities(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getTimeline = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<TimelineQuery>(req);
  const timeline = await activityService.getTimeline(query, getAuthContext(req));
  return sendSuccess(res, timeline);
});

export const exportActivities = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListActivitiesQuery>(req);
  const csv = await activityService.exportActivities(query, getAuthContext(req));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="activities.csv"');
  return res.status(200).send(csv);
});

export const importActivitiesCsv = asyncHandler(async (req, res) => {
  const result = await activityService.importActivitiesCsv(req.body, getAuthContext(req));
  return sendCreated(res, result, "Activities imported");
});

export const createActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.createActivity(req.body, getAuthContext(req));
  return sendCreated(res, activity, "Activity logged");
});

export const getActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.getActivity(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, activity);
});

export const getActivityHistory = asyncHandler(async (req, res) => {
  const history = await activityService.getActivityHistory(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, history);
});

export const updateActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.updateActivity(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, activity, "Activity updated");
});

export const completeActivity = asyncHandler(async (req, res) => {
  const result = await activityService.completeActivity(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, result, "Activity completed");
});

export const reopenActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.reopenActivity(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, activity, "Activity reopened");
});

export const cancelActivity = asyncHandler(async (req, res) => {
  const activity = await activityService.cancelActivity(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, activity, "Activity cancelled");
});

export const deleteActivity = asyncHandler(async (req, res) => {
  await activityService.deleteActivity(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Activity deleted");
});
