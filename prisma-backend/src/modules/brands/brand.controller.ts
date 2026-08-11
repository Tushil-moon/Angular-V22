import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListBrandsQuery } from "./brand.validation";
import { brandService } from "./brand.service";

export const listBrands = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListBrandsQuery>(req);
  const result = await brandService.list(query);
  return sendSuccess(res, result);
});

export const getBrand = asyncHandler(async (req, res) => {
  const brand = await brandService.getById(String(req.params.id));
  return sendSuccess(res, brand);
});

export const createBrand = asyncHandler(async (req, res) => {
  const brand = await brandService.create(req.body, req.user?.id);
  return sendCreated(res, brand, "Brand created");
});

export const updateBrand = asyncHandler(async (req, res) => {
  const brand = await brandService.update(String(req.params.id), req.body, req.user?.id);
  return sendSuccess(res, brand, "Brand updated");
});

export const deleteBrand = asyncHandler(async (req, res) => {
  await brandService.remove(String(req.params.id), req.user?.id);
  return sendSuccess(res, null, "Brand deleted");
});
