import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListWarehousesQuery } from "./warehouse.validation";
import { warehouseService } from "./warehouse.service";

export const listWarehouses = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListWarehousesQuery>(req);
  const result = await warehouseService.list(query);
  return sendSuccess(res, result);
});

export const getWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await warehouseService.getById(String(req.params.id));
  return sendSuccess(res, warehouse);
});

export const createWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await warehouseService.create(req.body, req.user?.id);
  return sendCreated(res, warehouse, "Warehouse created");
});

export const updateWarehouse = asyncHandler(async (req, res) => {
  const warehouse = await warehouseService.update(String(req.params.id), req.body, req.user?.id);
  return sendSuccess(res, warehouse, "Warehouse updated");
});

export const deleteWarehouse = asyncHandler(async (req, res) => {
  await warehouseService.remove(String(req.params.id), req.user?.id);
  return sendSuccess(res, null, "Warehouse deleted");
});
