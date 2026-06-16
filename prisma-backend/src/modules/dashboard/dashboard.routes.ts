import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { getDashboardStats } from "./dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", authenticate, getDashboardStats);
