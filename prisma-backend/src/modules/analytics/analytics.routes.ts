import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./analytics.controller";
import { analyticsQuerySchema } from "./analytics.validation";

export const analyticsRouter = Router();

const canRead = requirePermission(Permissions.ReadAnalytics, Permissions.ManageAll);

analyticsRouter.use(authenticate);
analyticsRouter.get("/dashboard", canRead, validate({ query: analyticsQuerySchema }), controller.getDashboard);
analyticsRouter.get("/revenue", canRead, validate({ query: analyticsQuerySchema }), controller.getRevenue);
