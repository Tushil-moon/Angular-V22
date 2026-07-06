import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListQueuesQuery, ListSlaPoliciesQuery } from "./sla.validation";
import { slaService } from "./sla.service";

export const listPolicies = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListSlaPoliciesQuery>(req);
  const result = await slaService.listPolicies(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getPolicy = asyncHandler(async (req, res) => {
  const item = await slaService.getPolicyById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createPolicy = asyncHandler(async (req, res) => {
  const item = await slaService.createPolicy(req.body, getAuthContext(req));
  return sendCreated(res, item, "SLA policy created");
});

export const updatePolicy = asyncHandler(async (req, res) => {
  const item = await slaService.updatePolicy(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "SLA policy updated");
});

export const deletePolicy = asyncHandler(async (req, res) => {
  await slaService.deletePolicy(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "SLA policy deleted");
});

export const listQueues = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListQueuesQuery>(req);
  const result = await slaService.listQueues(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getQueue = asyncHandler(async (req, res) => {
  const item = await slaService.getQueueById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createQueue = asyncHandler(async (req, res) => {
  const item = await slaService.createQueue(req.body, getAuthContext(req));
  return sendCreated(res, item, "Queue created");
});

export const updateQueue = asyncHandler(async (req, res) => {
  const item = await slaService.updateQueue(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Queue updated");
});

export const deleteQueue = asyncHandler(async (req, res) => {
  await slaService.deleteQueue(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Queue deleted");
});
