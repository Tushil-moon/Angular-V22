import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListLeadScoreRulesQuery } from "./lead-score.validation";
import { leadScoreService } from "./lead-score.service";

export const listRules = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListLeadScoreRulesQuery>(req);
  const result = await leadScoreService.listRules(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getRule = asyncHandler(async (req, res) => {
  const item = await leadScoreService.getRuleById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createRule = asyncHandler(async (req, res) => {
  const item = await leadScoreService.createRule(req.body, getAuthContext(req));
  return sendCreated(res, item, "Lead score rule created");
});

export const updateRule = asyncHandler(async (req, res) => {
  const item = await leadScoreService.updateRule(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Lead score rule updated");
});

export const deleteRule = asyncHandler(async (req, res) => {
  await leadScoreService.deleteRule(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Lead score rule deleted");
});
