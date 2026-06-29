import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCasesQuery } from "./case.validation";
import { caseService } from "./case.service";

export const listCases = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCasesQuery>(req);
  const result = await caseService.listCases(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getCase = asyncHandler(async (req, res) => {
  const item = await caseService.getCaseById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createCase = asyncHandler(async (req, res) => {
  const item = await caseService.createCase(req.body, getAuthContext(req));
  return sendCreated(res, item, "Case created");
});

export const updateCase = asyncHandler(async (req, res) => {
  const item = await caseService.updateCase(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Case updated");
});

export const deleteCase = asyncHandler(async (req, res) => {
  await caseService.deleteCase(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Case deleted");
});
