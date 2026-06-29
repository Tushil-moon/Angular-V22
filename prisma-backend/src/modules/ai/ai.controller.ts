import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListAiFeatureFlagsQuery, ListAiInsightsQuery } from "./ai.validation";
import { aiService } from "./ai.service";

export const listFeatureFlags = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListAiFeatureFlagsQuery>(req);
  const result = await aiService.listFeatureFlags(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getFeatureFlag = asyncHandler(async (req, res) => {
  const item = await aiService.getFeatureFlagById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createFeatureFlag = asyncHandler(async (req, res) => {
  const item = await aiService.createFeatureFlag(req.body, getAuthContext(req));
  return sendCreated(res, item, "AI feature flag created");
});

export const updateFeatureFlag = asyncHandler(async (req, res) => {
  const item = await aiService.updateFeatureFlag(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "AI feature flag updated");
});

export const deleteFeatureFlag = asyncHandler(async (req, res) => {
  await aiService.deleteFeatureFlag(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "AI feature flag deleted");
});

export const listInsights = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListAiInsightsQuery>(req);
  const result = await aiService.listInsights(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getInsight = asyncHandler(async (req, res) => {
  const item = await aiService.getInsightById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createInsight = asyncHandler(async (req, res) => {
  const item = await aiService.createInsight(req.body, getAuthContext(req));
  return sendCreated(res, item, "AI insight created");
});

export const deleteInsight = asyncHandler(async (req, res) => {
  await aiService.deleteInsight(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "AI insight deleted");
});
