import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { healthRouter } from "./modules/health/health.routes";
import { roleRouter } from "./modules/roles/role.routes";
import { sessionRouter } from "./modules/sessions/session.routes";
import { userRouter } from "./modules/users/user.routes";
import { contactRouter } from "./modules/contacts/contact.routes";
import { dealRouter } from "./modules/deals/deal.routes";
import { activityRouter } from "./modules/activities/activity.routes";

export const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/users", userRouter);
router.use("/sessions", sessionRouter);
router.use("/roles", roleRouter);
router.use("/contacts", contactRouter);
router.use("/deals", dealRouter);
router.use("/activities", activityRouter);
