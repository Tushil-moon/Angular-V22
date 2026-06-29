import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListApiKeysQuery } from "./api-key.validation";
import { apiKeyService } from "./api-key.service";

export const listApiKeys = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListApiKeysQuery>(req);
  const result = await apiKeyService.listApiKeys(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getApiKey = asyncHandler(async (req, res) => {
  const item = await apiKeyService.getApiKeyById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createApiKey = asyncHandler(async (req, res) => {
  const item = await apiKeyService.createApiKey(req.body, getAuthContext(req));
  return sendCreated(res, item, "API key created");
});

export const deleteApiKey = asyncHandler(async (req, res) => {
  await apiKeyService.deleteApiKey(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "API key deleted");
});
