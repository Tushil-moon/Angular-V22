import { asyncHandler } from "../../shared/utils/async-handler";
import { getAuthContext } from "../../shared/utils/auth-context";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListSavedViewsQuery } from "./saved-view.validation";
import { savedViewService } from "./saved-view.service";

export const listSavedViews = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListSavedViewsQuery>(req);
  const views = await savedViewService.listSavedViews(getAuthContext(req), query);
  return sendSuccess(res, views);
});

export const createSavedView = asyncHandler(async (req, res) => {
  const view = await savedViewService.createSavedView(getAuthContext(req), req.body);
  return sendCreated(res, view, "Saved view created");
});

export const updateSavedView = asyncHandler(async (req, res) => {
  const view = await savedViewService.updateSavedView(String(req.params.id), getAuthContext(req), req.body);
  return sendSuccess(res, view, "Saved view updated");
});

export const deleteSavedView = asyncHandler(async (req, res) => {
  await savedViewService.deleteSavedView(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Saved view deleted");
});
