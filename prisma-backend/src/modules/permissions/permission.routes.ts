import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./permission.controller";

export const permissionRouter = Router();

const canReadRoles = requirePermission(Permissions.ReadRoles, Permissions.ManageRoles);

permissionRouter.get("/", authenticate, canReadRoles, controller.listPermissions);
