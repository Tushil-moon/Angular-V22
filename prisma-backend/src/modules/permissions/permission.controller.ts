import { asyncHandler } from "../../shared/utils/async-handler";
import { sendSuccess } from "../../shared/utils/response";
import { permissionService } from "./permission.service";

export const listPermissions = asyncHandler(async (_req, res) => {
  const permissions = await permissionService.listPermissions();
  return sendSuccess(res, permissions);
});
