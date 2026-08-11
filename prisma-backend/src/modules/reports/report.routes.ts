import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./report.controller";
import {
  createReportSchema,
  listReportsQuerySchema,
  reportIdParamSchema,
} from "./report.validation";

export const reportRouter = Router();

const canRead = requirePermission(Permissions.ReadReports, Permissions.ManageReports);
const canManage = requirePermission(Permissions.ManageReports);

reportRouter.use(authenticate);

reportRouter.get("/", canRead, validate({ query: listReportsQuerySchema }), controller.listReports);
reportRouter.post("/", canManage, validate({ body: createReportSchema }), controller.createReport);
reportRouter.get("/:id", canRead, validate({ params: reportIdParamSchema }), controller.getReport);
