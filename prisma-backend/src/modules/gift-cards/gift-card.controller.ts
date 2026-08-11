import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListGiftCardsQuery } from "./gift-card.validation";
import { giftCardService } from "./gift-card.service";

export const listGiftCards = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListGiftCardsQuery>(req);
  const result = await giftCardService.list(query);
  return sendSuccess(res, result);
});

export const getGiftCard = asyncHandler(async (req, res) => {
  const giftCard = await giftCardService.getById(String(req.params.id));
  return sendSuccess(res, giftCard);
});

export const createGiftCard = asyncHandler(async (req, res) => {
  const giftCard = await giftCardService.create(req.body);
  return sendCreated(res, giftCard, "Gift card created");
});

export const updateGiftCard = asyncHandler(async (req, res) => {
  const giftCard = await giftCardService.update(String(req.params.id), req.body);
  return sendSuccess(res, giftCard, "Gift card updated");
});
