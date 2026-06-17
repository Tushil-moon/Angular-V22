import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListDealsQuery } from "./deal.validation";
import { dealService } from "./deal.service";

export const listDeals = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListDealsQuery>(req);
  const result = await dealService.listDeals(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getBoard = asyncHandler(async (req, res) => {
  const board = await dealService.getBoard(getAuthContext(req));
  return sendSuccess(res, board);
});

export const getPipeline = asyncHandler(async (req, res) => {
  const pipeline = await dealService.getPipelineSummary(getAuthContext(req));
  return sendSuccess(res, pipeline);
});

export const getDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.getDealById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, deal);
});

export const createDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.createDeal(req.body, getAuthContext(req));
  return sendCreated(res, deal, "Deal created");
});

export const updateDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.updateDeal(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, deal, "Deal updated");
});

export const deleteDeal = asyncHandler(async (req, res) => {
  await dealService.deleteDeal(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Deal deleted");
});
