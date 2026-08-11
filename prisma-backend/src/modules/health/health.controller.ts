import { asyncHandler } from "../../shared/utils/async-handler";
import { sendSuccess } from "../../shared/utils/response";
import { healthService } from "./health.service";

export const getHealth = asyncHandler(async (_req, res) => {
  const status = await healthService.check();
  return sendSuccess(res, status, "OK");
});

export const getLive = asyncHandler(async (_req, res) => {
  return sendSuccess(res, healthService.live());
});

export const getReady = asyncHandler(async (_req, res) => {
  const status = await healthService.ready();
  return sendSuccess(res, status);
});
