import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { getDashboardStats } from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", authenticate, resolveOrganization, getDashboardStats);
