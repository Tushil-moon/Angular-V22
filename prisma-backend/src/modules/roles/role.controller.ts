import { asyncHandler } from "../../shared/utils/async-handler";
import { getRequestMeta } from "../../shared/utils/request-meta";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import { roleService } from "./role.service";

export const listPermissions = asyncHandler(async (_req, res) => {
  const permissions = await roleService.listPermissions();
  return sendSuccess(res, permissions);
});

export const listRoles = asyncHandler(async (_req, res) => {
  const roles = await roleService.listRoles();
  return sendSuccess(res, roles);
});

export const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(req.body);
  return sendCreated(res, role, "Role created");
});

export const updateRolePermissions = asyncHandler(async (req, res) => {
  const role = await roleService.updateRolePermissions(String(req.params.id), req.body);
  return sendSuccess(res, role, "Role permissions updated");
});

export const assignRole = asyncHandler(async (req, res) => {
  await roleService.assignRole(req.body, req.user!.id, getRequestMeta(req));
  return sendSuccess(res, null, "Role assigned");
});

export const removeRole = asyncHandler(async (req, res) => {
  await roleService.removeRole(req.body, req.user!.id, getRequestMeta(req));
  return sendSuccess(res, null, "Role removed");
});
