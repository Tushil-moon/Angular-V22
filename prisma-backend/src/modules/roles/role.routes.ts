import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./role.controller";
import {
  createRoleSchema,
  listRolesQuerySchema,
  roleIdParamSchema,
  updateRolePermissionsSchema,
  updateRoleSchema,
} from "./role.validation";

export const roleRouter = Router();

const canReadRoles = requirePermission(Permissions.ReadRoles, Permissions.ManageRoles);
const canManageRoles = requirePermission(Permissions.ManageRoles);

roleRouter.get("/", authenticate, canReadRoles, validate({ query: listRolesQuerySchema }), controller.listRoles);
roleRouter.post("/", authenticate, canManageRoles, validate({ body: createRoleSchema }), controller.createRole);
roleRouter.get(
  "/:id",
  authenticate,
  canReadRoles,
  validate({ params: roleIdParamSchema }),
  controller.getRole,
);
roleRouter.patch(
  "/:id",
  authenticate,
  canManageRoles,
  validate({ params: roleIdParamSchema, body: updateRoleSchema }),
  controller.updateRole,
);
roleRouter.delete(
  "/:id",
  authenticate,
  canManageRoles,
  validate({ params: roleIdParamSchema }),
  controller.deleteRole,
);
roleRouter.patch(
  "/:id/permissions",
  authenticate,
  canManageRoles,
  validate({ params: roleIdParamSchema, body: updateRolePermissionsSchema }),
  controller.updateRolePermissions,
);
