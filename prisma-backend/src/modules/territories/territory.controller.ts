import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListTerritoriesQuery } from "./territory.validation";
import { territoryService } from "./territory.service";

export const listTerritories = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListTerritoriesQuery>(req);
  const result = await territoryService.listTerritories(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getTerritory = asyncHandler(async (req, res) => {
  const item = await territoryService.getTerritoryById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createTerritory = asyncHandler(async (req, res) => {
  const item = await territoryService.createTerritory(req.body, getAuthContext(req));
  return sendCreated(res, item, "Territory created");
});

export const updateTerritory = asyncHandler(async (req, res) => {
  const item = await territoryService.updateTerritory(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Territory updated");
});

export const deleteTerritory = asyncHandler(async (req, res) => {
  await territoryService.deleteTerritory(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Territory deleted");
});
