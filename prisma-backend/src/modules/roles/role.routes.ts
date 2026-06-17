import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./role.controller";
import {
  assignRoleSchema,
  createRoleSchema,
  removeRoleSchema,
  roleIdParamSchema,
  updateRolePermissionsSchema,
} from "./role.validation";

export const roleRouter = Router();

const canReadRoles = requirePermission(Permissions.ReadRoles, Permissions.ManageRoles);
const canManageRoles = requirePermission(Permissions.ManageRoles);

roleRouter.use(authenticate);
roleRouter.get("/permissions/all", canReadRoles, controller.listPermissions);
roleRouter.get("/", canReadRoles, controller.listRoles);
roleRouter.post("/", canManageRoles, validate({ body: createRoleSchema }), controller.createRole);
roleRouter.put(
  "/:id/permissions",
  canManageRoles,
  validate({ params: roleIdParamSchema, body: updateRolePermissionsSchema }),
  controller.updateRolePermissions,
);
roleRouter.post("/assign", canManageRoles, validate({ body: assignRoleSchema }), controller.assignRole);
roleRouter.post("/remove", canManageRoles, validate({ body: removeRoleSchema }), controller.removeRole);
