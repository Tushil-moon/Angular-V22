import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListDealsQuery } from "./deal.validation";
import { dealService } from "./deal.service";

export const listDeals = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListDealsQuery>(req);
  const result = await dealService.listDeals(query);
  return sendSuccess(res, result);
});

export const getPipeline = asyncHandler(async (_req, res) => {
  const pipeline = await dealService.getPipelineSummary();
  return sendSuccess(res, pipeline);
});

export const getDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.getDealById(String(req.params.id));
  return sendSuccess(res, deal);
});

export const createDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.createDeal(req.body, req.user!.id);
  return sendCreated(res, deal, "Deal created");
});

export const updateDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.updateDeal(String(req.params.id), req.body);
  return sendSuccess(res, deal, "Deal updated");
});

export const deleteDeal = asyncHandler(async (req, res) => {
  await dealService.deleteDeal(String(req.params.id));
  return sendSuccess(res, null, "Deal deleted");
});
