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

export const addCaseComment = asyncHandler(async (req, res) => {
  const item = await caseService.addComment(String(req.params.id), req.body, getAuthContext(req));
  return sendCreated(res, item, "Comment added");
});

export const assignCase = asyncHandler(async (req, res) => {
  const item = await caseService.assignCase(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Case assigned");
});

export const resolveCase = asyncHandler(async (req, res) => {
  const item = await caseService.resolveCase(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item, "Case resolved");
});

export const closeCase = asyncHandler(async (req, res) => {
  const item = await caseService.closeCase(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item, "Case closed");
});

export const reopenCase = asyncHandler(async (req, res) => {
  const item = await caseService.reopenCase(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item, "Case reopened");
});

export const listCaseHistory = asyncHandler(async (req, res) => {
  const history = await caseService.listHistory(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, history);
});
