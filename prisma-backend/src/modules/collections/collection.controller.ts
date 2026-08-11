import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCollectionsQuery } from "./collection.validation";
import { collectionService } from "./collection.service";

export const listCollections = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCollectionsQuery>(req);
  const result = await collectionService.list(query);
  return sendSuccess(res, result);
});

export const getCollection = asyncHandler(async (req, res) => {
  const collection = await collectionService.getById(String(req.params.id));
  return sendSuccess(res, collection);
});

export const createCollection = asyncHandler(async (req, res) => {
  const collection = await collectionService.create(req.body);
  return sendCreated(res, collection, "Collection created");
});

export const updateCollection = asyncHandler(async (req, res) => {
  const collection = await collectionService.update(String(req.params.id), req.body);
  return sendSuccess(res, collection, "Collection updated");
});

export const deleteCollection = asyncHandler(async (req, res) => {
  await collectionService.remove(String(req.params.id));
  return sendSuccess(res, null, "Collection deleted");
});
