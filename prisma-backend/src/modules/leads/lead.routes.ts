import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./lead.controller";
import {
  assignLeadSchema,
  convertLeadSchema,
  createLeadSchema,
  disqualifyLeadSchema,
  importLeadsCsvSchema,
  importLeadsSchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
  qualifyLeadSchema,
  updateLeadSchema,
} from "./lead.validation";

export const leadRouter = Router();

const canRead = requirePermission(Permissions.ReadLeads);
const canManage = requirePermission(Permissions.ManageLeads);

leadRouter.use(authenticate, resolveOrganization);

leadRouter.get("/", canRead, validate({ query: listLeadsQuerySchema }), controller.listLeads);
leadRouter.get("/export", canRead, validate({ query: listLeadsQuerySchema }), controller.exportLeads);
leadRouter.post("/import", canManage, validate({ body: importLeadsSchema }), controller.importLeads);
leadRouter.post("/import/csv", canManage, validate({ body: importLeadsCsvSchema }), controller.importLeadsCsv);
leadRouter.post("/", canManage, validate({ body: createLeadSchema }), controller.createLead);
leadRouter.get("/:id", canRead, validate({ params: leadIdParamSchema }), controller.getLead);
leadRouter.get(
  "/:id/history",
  canRead,
  validate({ params: leadIdParamSchema }),
  controller.getLeadHistory,
);
leadRouter.patch(
  "/:id",
  canManage,
  validate({ params: leadIdParamSchema, body: updateLeadSchema }),
  controller.updateLead,
);
leadRouter.post(
  "/:id/qualify",
  canManage,
  validate({ params: leadIdParamSchema, body: qualifyLeadSchema }),
  controller.qualifyLead,
);
leadRouter.post(
  "/:id/disqualify",
  canManage,
  validate({ params: leadIdParamSchema, body: disqualifyLeadSchema }),
  controller.disqualifyLead,
);
leadRouter.post(
  "/:id/assign",
  canManage,
  validate({ params: leadIdParamSchema, body: assignLeadSchema }),
  controller.assignLead,
);
leadRouter.post(
  "/:id/score",
  canManage,
  validate({ params: leadIdParamSchema }),
  controller.scoreLead,
);
leadRouter.post(
  "/:id/convert",
  canManage,
  validate({ params: leadIdParamSchema, body: convertLeadSchema }),
  controller.convertLead,
);
leadRouter.delete(
  "/:id",
  canManage,
  validate({ params: leadIdParamSchema }),
  controller.deleteLead,
);
