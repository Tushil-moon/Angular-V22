import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import { AppError } from "../../shared/errors/app-error";
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

export const uploadMedia = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    throw new AppError(400, "No image file provided", "FILE_REQUIRED");
  }

  const altText =
    typeof req.body?.altText === "string" && req.body.altText.trim()
      ? req.body.altText.trim()
      : null;

  const asset = await mediaService.upload({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
    size: file.size,
    altText,
  });

  return sendCreated(res, asset, "Image uploaded");
});
