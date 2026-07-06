import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCampaignsQuery } from "./campaign.validation";
import { campaignService } from "./campaign.service";

export const listCampaigns = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCampaignsQuery>(req);
  const result = await campaignService.listCampaigns(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getCampaign = asyncHandler(async (req, res) => {
  const item = await campaignService.getCampaignById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createCampaign = asyncHandler(async (req, res) => {
  const item = await campaignService.createCampaign(req.body, getAuthContext(req));
  return sendCreated(res, item, "Campaign created");
});

export const updateCampaign = asyncHandler(async (req, res) => {
  const item = await campaignService.updateCampaign(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Campaign updated");
});

export const deleteCampaign = asyncHandler(async (req, res) => {
  await campaignService.deleteCampaign(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Campaign deleted");
});

export const activateCampaign = asyncHandler(async (req, res) => {
  const item = await campaignService.activateCampaign(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item, "Campaign activated");
});

export const completeCampaign = asyncHandler(async (req, res) => {
  const item = await campaignService.completeCampaign(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item, "Campaign completed");
});

export const addCampaignMembers = asyncHandler(async (req, res) => {
  const item = await campaignService.addMembers(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Members added");
});

export const removeCampaignMember = asyncHandler(async (req, res) => {
  const item = await campaignService.removeMember(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Member removed");
});

export const sendCampaign = asyncHandler(async (req, res) => {
  const item = await campaignService.sendCampaign(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item, "Campaign send queued");
});

export const listCampaignHistory = asyncHandler(async (req, res) => {
  const history = await campaignService.listHistory(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, history);
});
