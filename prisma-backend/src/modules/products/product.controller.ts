import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListProductsQuery } from "./product.validation";
import { productService } from "./product.service";

export const listProducts = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListProductsQuery>(req);
  const result = await productService.listProducts(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, product);
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, getAuthContext(req));
  return sendCreated(res, product, "Product created");
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, product, "Product updated");
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Product deleted");
});
