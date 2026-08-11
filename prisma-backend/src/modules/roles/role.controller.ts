import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedBody, getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type {
  CreateRoleInput,
  ListRolesQuery,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
} from "./role.validation";
import { roleService } from "./role.service";

export const listRoles = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListRolesQuery>(req);
  const result = await roleService.listRoles(query);
  return sendSuccess(res, result);
});

export const getRole = asyncHandler(async (req, res) => {
  const role = await roleService.getRoleById(String(req.params.id));
  return sendSuccess(res, role);
});

export const createRole = asyncHandler(async (req, res) => {
  const body = getValidatedBody<CreateRoleInput>(req);
  const role = await roleService.createRole(body);
  return sendCreated(res, role, "Role created");
});

export const updateRole = asyncHandler(async (req, res) => {
  const body = getValidatedBody<UpdateRoleInput>(req);
  const role = await roleService.updateRole(String(req.params.id), body);
  return sendSuccess(res, role, "Role updated");
});

export const deleteRole = asyncHandler(async (req, res) => {
  await roleService.deleteRole(String(req.params.id));
  return sendSuccess(res, null, "Role deleted");
});

export const updateRolePermissions = asyncHandler(async (req, res) => {
  const body = getValidatedBody<UpdateRolePermissionsInput>(req);
  const role = await roleService.updateRolePermissions(String(req.params.id), body);
  return sendSuccess(res, role, "Role permissions updated");
});
