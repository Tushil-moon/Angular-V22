import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./audit-log.controller";
import { listAuditLogsQuerySchema } from "./audit-log.validation";

export const auditLogRouter = Router();

const canReadAuditLogs = requirePermission(Permissions.ReadAuditLogs);

auditLogRouter.get(
  "/",
  authenticate,
  canReadAuditLogs,
  validate({ query: listAuditLogsQuerySchema }),
  controller.listAuditLogs,
);
