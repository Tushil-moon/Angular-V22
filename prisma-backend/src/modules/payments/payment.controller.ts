import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendSuccess } from "../../shared/utils/response";
import type { ListPaymentsQuery } from "./payment.validation";
import { paymentService } from "./payment.service";

export const listPayments = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListPaymentsQuery>(req);
  const result = await paymentService.list(query);
  return sendSuccess(res, result);
});

export const getPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.getById(String(req.params.id));
  return sendSuccess(res, payment);
});
