import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./case.controller";
import {
  addCaseCommentSchema,
  assignCaseSchema,
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
caseRouter.get(
  "/:id/history",
  canRead,
  validate({ params: caseIdParamSchema }),
  controller.listCaseHistory,
);
caseRouter.patch(
  "/:id",
  canManage,
  validate({ params: caseIdParamSchema, body: updateCaseSchema }),
  controller.updateCase,
);
caseRouter.post(
  "/:id/comments",
  canManage,
  validate({ params: caseIdParamSchema, body: addCaseCommentSchema }),
  controller.addCaseComment,
);
caseRouter.post(
  "/:id/assign",
  canManage,
  validate({ params: caseIdParamSchema, body: assignCaseSchema }),
  controller.assignCase,
);
caseRouter.post(
  "/:id/resolve",
  canManage,
  validate({ params: caseIdParamSchema }),
  controller.resolveCase,
);
caseRouter.post(
  "/:id/close",
  canManage,
  validate({ params: caseIdParamSchema }),
  controller.closeCase,
);
caseRouter.post(
  "/:id/reopen",
  canManage,
  validate({ params: caseIdParamSchema }),
  controller.reopenCase,
);
caseRouter.delete("/:id", canManage, validate({ params: caseIdParamSchema }), controller.deleteCase);
