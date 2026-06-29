import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListWorkflowsQuery } from "./workflow.validation";
import { workflowService } from "./workflow.service";

export const listWorkflows = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListWorkflowsQuery>(req);
  const result = await workflowService.listWorkflows(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getWorkflow = asyncHandler(async (req, res) => {
  const item = await workflowService.getWorkflowById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createWorkflow = asyncHandler(async (req, res) => {
  const item = await workflowService.createWorkflow(req.body, getAuthContext(req));
  return sendCreated(res, item, "Workflow created");
});

export const updateWorkflow = asyncHandler(async (req, res) => {
  const item = await workflowService.updateWorkflow(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Workflow updated");
});

export const deleteWorkflow = asyncHandler(async (req, res) => {
  await workflowService.deleteWorkflow(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Workflow deleted");
});
