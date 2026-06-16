import { asyncHandler } from "../../shared/utils/async-handler";
import { sendSuccess } from "../../shared/utils/response";
import { healthService } from "./health.service";

export const getHealth = asyncHandler(async (_req, res) => {
  const status = await healthService.check();
  return sendSuccess(res, status, "OK");
});
