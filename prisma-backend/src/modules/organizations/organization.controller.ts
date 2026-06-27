import { asyncHandler } from "../../shared/utils/async-handler";
import { prisma } from "../../config/prisma";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import { organizationService } from "./organization.service";

export const listOrganizations = asyncHandler(async (req, res) => {
  const organizations = await organizationService.listOrganizations(req.user!.id);
  return sendSuccess(res, organizations);
});

export const getCurrentOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.getCurrentOrganization(getAuthContext(req));
  return sendSuccess(res, organization);
});

export const createOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.createOrganization(req.body, req.user!.id);
  return sendCreated(res, organization, "Organization created");
});

export const updateCurrentOrganization = asyncHandler(async (req, res) => {
  const organization = await organizationService.updateCurrentOrganization(req.body, getAuthContext(req));
  return sendSuccess(res, organization, "Organization updated");
});

export const listMembers = asyncHandler(async (req, res) => {
  const members = await organizationService.listMembers(getAuthContext(req));
  return sendSuccess(res, members);
});

export const inviteMember = asyncHandler(async (req, res) => {
  const invite = await organizationService.inviteMember(req.body, getAuthContext(req));
  return sendCreated(res, invite, "Invite created");
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { email: true },
  });
  const organization = await organizationService.acceptInvite(
    String(req.params.token),
    req.user!.id,
    user?.email,
  );
  return sendSuccess(res, organization, "Invite accepted");
});

export const removeMember = asyncHandler(async (req, res) => {
  await organizationService.removeMember(String(req.params.id), String(req.params.userId), getAuthContext(req));
  return sendSuccess(res, null, "Member removed");
});
