import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListPurchaseOrdersQuery } from "./purchase-order.validation";
import { purchaseOrderService } from "./purchase-order.service";

export const listPurchaseOrders = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListPurchaseOrdersQuery>(req);
  const result = await purchaseOrderService.list(query);
  return sendSuccess(res, result);
});

export const getPurchaseOrder = asyncHandler(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.getById(String(req.params.id));
  return sendSuccess(res, purchaseOrder);
});

export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.create(req.body);
  return sendCreated(res, purchaseOrder, "Purchase order created");
});

export const updatePurchaseOrder = asyncHandler(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.update(String(req.params.id), req.body);
  return sendSuccess(res, purchaseOrder, "Purchase order updated");
});

export const deletePurchaseOrder = asyncHandler(async (req, res) => {
  await purchaseOrderService.remove(String(req.params.id));
  return sendSuccess(res, null, "Purchase order deleted");
});
