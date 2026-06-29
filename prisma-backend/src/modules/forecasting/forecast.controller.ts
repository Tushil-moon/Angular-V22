import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListForecastsQuery } from "./forecast.validation";
import { forecastService } from "./forecast.service";

export const listForecasts = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListForecastsQuery>(req);
  const result = await forecastService.listForecasts(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getForecast = asyncHandler(async (req, res) => {
  const item = await forecastService.getForecastById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createForecast = asyncHandler(async (req, res) => {
  const item = await forecastService.createForecast(req.body, getAuthContext(req));
  return sendCreated(res, item, "Forecast period created");
});

export const updateForecast = asyncHandler(async (req, res) => {
  const item = await forecastService.updateForecast(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Forecast period updated");
});

export const deleteForecast = asyncHandler(async (req, res) => {
  await forecastService.deleteForecast(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Forecast period deleted");
});
