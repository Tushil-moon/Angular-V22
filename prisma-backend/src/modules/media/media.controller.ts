import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListMediaQuery } from "./media.validation";
import { mediaService } from "./media.service";

export const listMedia = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListMediaQuery>(req);
  const result = await mediaService.list(query);
  return sendSuccess(res, result);
});

export const getMedia = asyncHandler(async (req, res) => {
  const asset = await mediaService.getById(String(req.params.id));
  return sendSuccess(res, asset);
});

export const createMedia = asyncHandler(async (req, res) => {
  const asset = await mediaService.create(req.body);
  return sendCreated(res, asset, "Media asset created");
});
