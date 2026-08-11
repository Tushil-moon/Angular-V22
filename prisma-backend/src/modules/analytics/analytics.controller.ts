import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendSuccess } from "../../shared/utils/response";
import type { AnalyticsQuery } from "./analytics.validation";
import { analyticsService } from "./analytics.service";

export const getDashboard = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<AnalyticsQuery>(req);
  const data = await analyticsService.dashboard(query);
  return sendSuccess(res, data);
});

export const getRevenue = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<AnalyticsQuery>(req);
  const data = await analyticsService.revenue(query);
  return sendSuccess(res, data);
});
