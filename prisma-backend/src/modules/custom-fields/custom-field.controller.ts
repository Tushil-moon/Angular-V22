import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCustomFieldsQuery } from "./custom-field.validation";
import { customFieldService } from "./custom-field.service";

export const listFields = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCustomFieldsQuery>(req);
  const result = await customFieldService.listFields(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getField = asyncHandler(async (req, res) => {
  const item = await customFieldService.getFieldById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createField = asyncHandler(async (req, res) => {
  const item = await customFieldService.createField(req.body, getAuthContext(req));
  return sendCreated(res, item, "Custom field created");
});

export const updateField = asyncHandler(async (req, res) => {
  const item = await customFieldService.updateField(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Custom field updated");
});

export const deleteField = asyncHandler(async (req, res) => {
  await customFieldService.deleteField(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Custom field deleted");
});
