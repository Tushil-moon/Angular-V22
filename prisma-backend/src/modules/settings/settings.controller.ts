import { asyncHandler } from "../../shared/utils/async-handler";
import { sendSuccess } from "../../shared/utils/response";
import { settingsService } from "./settings.service";

export const getStoreSettings = asyncHandler(async (_req, res) => {
  const store = await settingsService.getStore();
  return sendSuccess(res, store);
});

export const updateStoreSettings = asyncHandler(async (req, res) => {
  const store = await settingsService.updateStore(req.body, req.user?.id);
  return sendSuccess(res, store, "Store settings updated");
});
