import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { loadUserEmailForInvite } from "../../middlewares/auth-stack";
import { resolveOrganization, requireOrganizationAdmin } from "../../middlewares/resolve-organization";
import { validate } from "../../middlewares/validate";
import * as controller from "./organization.controller";
import {
  acceptInviteParamSchema,
  createOrganizationSchema,
  inviteMemberSchema,
  memberUserIdParamSchema,
  updateOrganizationSchema,
} from "./organization.validation";

export const organizationRouter = Router();

organizationRouter.get("/", authenticate, controller.listOrganizations);
organizationRouter.post("/", authenticate, validate({ body: createOrganizationSchema }), controller.createOrganization);
organizationRouter.get("/current", authenticate, resolveOrganization, controller.getCurrentOrganization);
organizationRouter.patch(
  "/current",
  authenticate,
  resolveOrganization,
  requireOrganizationAdmin,
  validate({ body: updateOrganizationSchema }),
  controller.updateCurrentOrganization,
);
organizationRouter.get("/current/members", authenticate, resolveOrganization, controller.listMembers);
organizationRouter.post(
  "/current/members/invite",
  authenticate,
  resolveOrganization,
  requireOrganizationAdmin,
  validate({ body: inviteMemberSchema }),
  controller.inviteMember,
);
organizationRouter.post(
  "/invites/:token/accept",
  authenticate,
  loadUserEmailForInvite,
  validate({ params: acceptInviteParamSchema }),
  controller.acceptInvite,
);
organizationRouter.delete(
  "/:id/members/:userId",
  authenticate,
  resolveOrganization,
  requireOrganizationAdmin,
  validate({ params: memberUserIdParamSchema }),
  controller.removeMember,
);
