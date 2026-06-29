import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./report.controller";
import {
  createDashboardLayoutSchema,
  createReportSchema,
  dashboardLayoutIdParamSchema,
  listDashboardLayoutsQuerySchema,
  listReportsQuerySchema,
  reportIdParamSchema,
  updateDashboardLayoutSchema,
  updateReportSchema,
} from "./report.validation";

export const reportRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

reportRouter.use(authenticate, resolveOrganization);

reportRouter.get("/layouts", canRead, validate({ query: listDashboardLayoutsQuerySchema }), controller.listDashboardLayouts);
reportRouter.post("/layouts", canManage, validate({ body: createDashboardLayoutSchema }), controller.createDashboardLayout);
reportRouter.get("/layouts/:id", canRead, validate({ params: dashboardLayoutIdParamSchema }), controller.getDashboardLayout);
reportRouter.patch(
  "/layouts/:id",
  canManage,
  validate({ params: dashboardLayoutIdParamSchema, body: updateDashboardLayoutSchema }),
  controller.updateDashboardLayout,
);
reportRouter.delete("/layouts/:id", canManage, validate({ params: dashboardLayoutIdParamSchema }), controller.deleteDashboardLayout);

reportRouter.get("/", canRead, validate({ query: listReportsQuerySchema }), controller.listReports);
reportRouter.post("/", canManage, validate({ body: createReportSchema }), controller.createReport);
reportRouter.get("/:id", canRead, validate({ params: reportIdParamSchema }), controller.getReport);
reportRouter.patch(
  "/:id",
  canManage,
  validate({ params: reportIdParamSchema, body: updateReportSchema }),
  controller.updateReport,
);
reportRouter.delete("/:id", canManage, validate({ params: reportIdParamSchema }), controller.deleteReport);
