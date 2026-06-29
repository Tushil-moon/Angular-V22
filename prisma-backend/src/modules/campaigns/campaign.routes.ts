import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./campaign.controller";
import {
  campaignIdParamSchema,
  createCampaignSchema,
  listCampaignsQuerySchema,
  updateCampaignSchema,
} from "./campaign.validation";

export const campaignRouter = Router();

const canRead = requirePermission(Permissions.ReadContacts);
const canManage = requirePermission(Permissions.ManageContacts);

campaignRouter.use(authenticate, resolveOrganization);

campaignRouter.get("/", canRead, validate({ query: listCampaignsQuerySchema }), controller.listCampaigns);
campaignRouter.post("/", canManage, validate({ body: createCampaignSchema }), controller.createCampaign);
campaignRouter.get("/:id", canRead, validate({ params: campaignIdParamSchema }), controller.getCampaign);
campaignRouter.patch(
  "/:id",
  canManage,
  validate({ params: campaignIdParamSchema, body: updateCampaignSchema }),
  controller.updateCampaign,
);
campaignRouter.delete("/:id", canManage, validate({ params: campaignIdParamSchema }), controller.deleteCampaign);
