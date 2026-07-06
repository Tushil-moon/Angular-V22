import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requireOrgStructureManage } from "../../middlewares/org-structure";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { validate } from "../../middlewares/validate";
import * as controller from "./org-unit.controller";
import {
  addOrgUnitMemberSchema,
  createOrgUnitSchema,
  memberProfileParamSchema,
  orgUnitIdParamSchema,
  orgUnitMemberParamSchema,
  updateMemberProfileSchema,
  updateOrgUnitSchema,
} from "./org-unit.validation";

export const orgUnitRouter = Router({ mergeParams: true });

orgUnitRouter.use(authenticate, resolveOrganization);

orgUnitRouter.get("/tree", controller.getUnitTree);
orgUnitRouter.get("/", controller.listUnits);
orgUnitRouter.post("/", requireOrgStructureManage, validate({ body: createOrgUnitSchema }), controller.createUnit);
orgUnitRouter.get("/:unitId", validate({ params: orgUnitIdParamSchema }), controller.getUnit);
orgUnitRouter.patch(
  "/:unitId",
  requireOrgStructureManage,
  validate({ params: orgUnitIdParamSchema, body: updateOrgUnitSchema }),
  controller.updateUnit,
);
orgUnitRouter.delete(
  "/:unitId",
  requireOrgStructureManage,
  validate({ params: orgUnitIdParamSchema }),
  controller.deleteUnit,
);
orgUnitRouter.get(
  "/:unitId/members",
  validate({ params: orgUnitIdParamSchema }),
  controller.listUnitMembers,
);
orgUnitRouter.post(
  "/:unitId/members",
  requireOrgStructureManage,
  validate({ params: orgUnitIdParamSchema, body: addOrgUnitMemberSchema }),
  controller.addUnitMember,
);
orgUnitRouter.delete(
  "/:unitId/members/:userId",
  requireOrgStructureManage,
  validate({ params: orgUnitMemberParamSchema }),
  controller.removeUnitMember,
);

export const employeeRouter = Router();

employeeRouter.use(authenticate, resolveOrganization);
employeeRouter.get("/hierarchy", controller.getEmployeeHierarchy);
employeeRouter.get("/", controller.listEmployees);
employeeRouter.patch(
  "/:userId/profile",
  requireOrgStructureManage,
  validate({ params: memberProfileParamSchema, body: updateMemberProfileSchema }),
  controller.updateMemberProfile,
);
