import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./case.controller";
import {
  caseIdParamSchema,
  createCaseSchema,
  listCasesQuerySchema,
  updateCaseSchema,
} from "./case.validation";

export const caseRouter = Router();

const canRead = requirePermission(Permissions.ReadActivities);
const canManage = requirePermission(Permissions.ManageActivities);

caseRouter.use(authenticate, resolveOrganization);

caseRouter.get("/", canRead, validate({ query: listCasesQuerySchema }), controller.listCases);
caseRouter.post("/", canManage, validate({ body: createCaseSchema }), controller.createCase);
caseRouter.get("/:id", canRead, validate({ params: caseIdParamSchema }), controller.getCase);
caseRouter.patch(
  "/:id",
  canManage,
  validate({ params: caseIdParamSchema, body: updateCaseSchema }),
  controller.updateCase,
);
caseRouter.delete("/:id", canManage, validate({ params: caseIdParamSchema }), controller.deleteCase);
