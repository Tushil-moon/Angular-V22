import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListSuppliersQuery } from "./supplier.validation";
import { supplierService } from "./supplier.service";

export const listSuppliers = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListSuppliersQuery>(req);
  const result = await supplierService.list(query);
  return sendSuccess(res, result);
});

export const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.getById(String(req.params.id));
  return sendSuccess(res, supplier);
});

export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.create(req.body);
  return sendCreated(res, supplier, "Supplier created");
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await supplierService.update(String(req.params.id), req.body);
  return sendSuccess(res, supplier, "Supplier updated");
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  await supplierService.remove(String(req.params.id));
  return sendSuccess(res, null, "Supplier deleted");
});
