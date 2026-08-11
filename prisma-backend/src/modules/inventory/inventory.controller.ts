import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendSuccess } from "../../shared/utils/response";
import type { ListInventoryQuery, ListMovementsQuery } from "./inventory.validation";
import { inventoryService } from "./inventory.service";

export const listInventory = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListInventoryQuery>(req);
  const result = await inventoryService.list(query);
  return sendSuccess(res, result);
});

export const getInventoryItem = asyncHandler(async (req, res) => {
  const item = await inventoryService.getById(String(req.params.id));
  return sendSuccess(res, item);
});

export const adjustInventory = asyncHandler(async (req, res) => {
  const item = await inventoryService.adjust(req.body, req.user?.id);
  return sendSuccess(res, item, "Inventory adjusted");
});

export const listLowStock = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListInventoryQuery>(req);
  const result = await inventoryService.lowStock(query);
  return sendSuccess(res, result);
});

export const listOutOfStock = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListInventoryQuery>(req);
  const result = await inventoryService.outOfStock(query);
  return sendSuccess(res, result);
});

export const listMovements = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListMovementsQuery>(req);
  const result = await inventoryService.listMovements(query);
  return sendSuccess(res, result);
});
