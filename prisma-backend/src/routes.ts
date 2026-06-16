import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { healthRouter } from "./modules/health/health.routes";
import { roleRouter } from "./modules/roles/role.routes";
import { sessionRouter } from "./modules/sessions/session.routes";
import { userRouter } from "./modules/users/user.routes";

export const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/users", userRouter);
router.use("/sessions", sessionRouter);
router.use("/roles", roleRouter);
