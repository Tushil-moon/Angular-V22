import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListPromotionsQuery } from "./promotion.validation";
import { promotionService } from "./promotion.service";

export const listPromotions = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListPromotionsQuery>(req);
  const result = await promotionService.list(query);
  return sendSuccess(res, result);
});

export const getPromotion = asyncHandler(async (req, res) => {
  const promotion = await promotionService.getById(String(req.params.id));
  return sendSuccess(res, promotion);
});

export const createPromotion = asyncHandler(async (req, res) => {
  const promotion = await promotionService.create(req.body);
  return sendCreated(res, promotion, "Promotion created");
});

export const updatePromotion = asyncHandler(async (req, res) => {
  const promotion = await promotionService.update(String(req.params.id), req.body);
  return sendSuccess(res, promotion, "Promotion updated");
});

export const deletePromotion = asyncHandler(async (req, res) => {
  await promotionService.remove(String(req.params.id));
  return sendSuccess(res, null, "Promotion deleted");
});
