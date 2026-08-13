import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListProductsQuery } from "./product.validation";
import { productService } from "./product.service";

export const listProducts = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListProductsQuery>(req);
  const result = await productService.list(query);
  return sendSuccess(res, result);
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getById(String(req.params.id));
  return sendSuccess(res, product);
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.create(req.body, req.user?.id);
  return sendCreated(res, product, "Product created");
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.update(String(req.params.id), req.body, req.user?.id);
  return sendSuccess(res, product, "Product updated");
});

export const deleteProduct = asyncHandler(async (req, res) => {
  await productService.remove(String(req.params.id), req.user?.id);
  return sendSuccess(res, null, "Product deleted");
});

export const publishProduct = asyncHandler(async (req, res) => {
  const product = await productService.publish(String(req.params.id), req.user?.id);
  return sendSuccess(res, product, "Product published");
});

export const archiveProduct = asyncHandler(async (req, res) => {
  const product = await productService.archive(String(req.params.id), req.user?.id);
  return sendSuccess(res, product, "Product archived");
});

export const duplicateProduct = asyncHandler(async (req, res) => {
  const product = await productService.duplicate(String(req.params.id), req.user?.id);
  return sendCreated(res, product, "Product duplicated");
});

export const importProducts = asyncHandler(async (req, res) => {
  const result = await productService.bulkImport(req.body, req.user?.id);
  const message = result.dryRun
    ? "Import validation completed"
    : `Imported ${result.summary.imported} of ${result.summary.total} products`;
  return sendSuccess(res, result, message);
});

export const listVariants = asyncHandler(async (req, res) => {
  const variants = await productService.listVariants(String(req.params.id));
  return sendSuccess(res, variants);
});

export const createVariant = asyncHandler(async (req, res) => {
  const variant = await productService.createVariant(String(req.params.id), req.body, req.user?.id);
  return sendCreated(res, variant, "Variant created");
});

export const updateVariant = asyncHandler(async (req, res) => {
  const variant = await productService.updateVariant(
    String(req.params.id),
    String(req.params.variantId),
    req.body,
    req.user?.id,
  );
  return sendSuccess(res, variant, "Variant updated");
});

export const deleteVariant = asyncHandler(async (req, res) => {
  await productService.deleteVariant(String(req.params.id), String(req.params.variantId));
  return sendSuccess(res, null, "Variant deleted");
});

export const listProductImages = asyncHandler(async (req, res) => {
  const images = await productService.listImages(String(req.params.id));
  return sendSuccess(res, images);
});

export const addProductImage = asyncHandler(async (req, res) => {
  const image = await productService.addImage(String(req.params.id), req.body, req.user?.id);
  return sendCreated(res, image, "Image added");
});

export const updateProductImage = asyncHandler(async (req, res) => {
  const image = await productService.updateImage(
    String(req.params.id),
    String(req.params.imageId),
    req.body,
    req.user?.id,
  );
  return sendSuccess(res, image, "Image updated");
});

export const deleteProductImage = asyncHandler(async (req, res) => {
  await productService.deleteImage(
    String(req.params.id),
    String(req.params.imageId),
    req.user?.id,
  );
  return sendSuccess(res, null, "Image deleted");
});

export const reorderProductImages = asyncHandler(async (req, res) => {
  const images = await productService.reorderImages(String(req.params.id), req.body, req.user?.id);
  return sendSuccess(res, images, "Images reordered");
});
