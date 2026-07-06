import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { BoardQuery, ListDealsQuery } from "./deal.validation";
import { dealService } from "./deal.service";

export const listDeals = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListDealsQuery>(req);
  const result = await dealService.listDeals(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getBoard = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<BoardQuery>(req);
  const board = await dealService.getBoard(getAuthContext(req), query.pipelineId);
  return sendSuccess(res, board);
});

export const getPipeline = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<BoardQuery>(req);
  const pipeline = await dealService.getPipelineSummary(getAuthContext(req), query.pipelineId);
  return sendSuccess(res, pipeline);
});

export const getDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.getDealById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, deal);
});

export const getDealHistory = asyncHandler(async (req, res) => {
  const history = await dealService.getDealHistory(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, history);
});

export const createDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.createDeal(req.body, getAuthContext(req));
  return sendCreated(res, deal, "Deal created");
});

export const updateDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.updateDeal(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, deal, "Deal updated");
});

export const winDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.winDeal(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, deal, "Deal marked as won");
});

export const loseDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.loseDeal(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, deal, "Deal marked as lost");
});

export const reopenDeal = asyncHandler(async (req, res) => {
  const deal = await dealService.reopenDeal(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, deal, "Deal reopened");
});

export const deleteDeal = asyncHandler(async (req, res) => {
  await dealService.deleteDeal(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Deal deleted");
});

export const importDeals = asyncHandler(async (req, res) => {
  const result = await dealService.importDeals(req.body, getAuthContext(req));
  return sendCreated(res, result, "Deals imported");
});

export const importDealsCsv = asyncHandler(async (req, res) => {
  const result = await dealService.importDealsCsv(req.body, getAuthContext(req));
  return sendCreated(res, result, "Deals imported from CSV");
});

export const exportDeals = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListDealsQuery>(req);
  const result = await dealService.exportDeals(query, getAuthContext(req));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="deals.csv"');
  return res.status(200).send(result.csv);
});
