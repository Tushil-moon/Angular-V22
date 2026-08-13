import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListRefundsQuery } from "./refund.validation";
import { refundService } from "./refund.service";

export const listRefunds = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListRefundsQuery>(req);
  const result = await refundService.list(query);
  return sendSuccess(res, result);
});

export const getRefund = asyncHandler(async (req, res) => {
  const refund = await refundService.getById(String(req.params.id));
  return sendSuccess(res, refund);
});

export const createRefund = asyncHandler(async (req, res) => {
  const refund = await refundService.create(req.body);
  return sendCreated(res, refund, "Refund requested");
});

export const updateRefund = asyncHandler(async (req, res) => {
  const refund = await refundService.updateStatus(String(req.params.id), req.body);
  return sendSuccess(res, refund, "Refund updated");
});
