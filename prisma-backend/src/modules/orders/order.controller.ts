import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListOrdersQuery } from "./order.validation";
import { orderService } from "./order.service";

export const listOrders = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListOrdersQuery>(req);
  const result = await orderService.list(query);
  return sendSuccess(res, result);
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getById(String(req.params.id));
  return sendSuccess(res, order);
});

export const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.create(req.body, req.user?.id);
  return sendCreated(res, order, "Order created");
});

export const confirmOrder = asyncHandler(async (req, res) => {
  const order = await orderService.confirm(String(req.params.id), req.user?.id);
  return sendSuccess(res, order, "Order confirmed");
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancel(String(req.params.id), req.user?.id);
  return sendSuccess(res, order, "Order cancelled");
});

export const shipOrder = asyncHandler(async (req, res) => {
  const order = await orderService.ship(String(req.params.id), req.user?.id);
  return sendSuccess(res, order, "Order shipped");
});

export const completeOrder = asyncHandler(async (req, res) => {
  const order = await orderService.complete(String(req.params.id), req.user?.id);
  return sendSuccess(res, order, "Order completed");
});

export const getOrderTimeline = asyncHandler(async (req, res) => {
  const timeline = await orderService.timeline(String(req.params.id));
  return sendSuccess(res, timeline);
});
