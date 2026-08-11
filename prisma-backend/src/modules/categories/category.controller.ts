import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCategoriesQuery } from "./category.validation";
import { categoryService } from "./category.service";

export const listCategories = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCategoriesQuery>(req);
  const result = await categoryService.list(query);
  return sendSuccess(res, result);
});

export const getCategoryTree = asyncHandler(async (_req, res) => {
  const tree = await categoryService.tree();
  return sendSuccess(res, tree);
});

export const getCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.getById(String(req.params.id));
  return sendSuccess(res, category);
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.create(req.body, req.user?.id);
  return sendCreated(res, category, "Category created");
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.update(String(req.params.id), req.body, req.user?.id);
  return sendSuccess(res, category, "Category updated");
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.remove(String(req.params.id), req.user?.id);
  return sendSuccess(res, null, "Category deleted");
});
