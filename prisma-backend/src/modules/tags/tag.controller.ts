import { asyncHandler } from "../../shared/utils/async-handler";
import { getAuthContext } from "../../shared/utils/auth-context";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListTagsQuery } from "./tag.validation";
import { tagService } from "./tag.service";

export const listTags = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListTagsQuery>(req);
  const tags = await tagService.listTags(query, getAuthContext(req));
  return sendSuccess(res, tags);
});

export const createTag = asyncHandler(async (req, res) => {
  const tag = await tagService.createTag(req.body, getAuthContext(req));
  return sendCreated(res, tag, "Tag created");
});
