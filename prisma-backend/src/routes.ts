import { Router } from "express";
import { prisma } from "./config/prisma";
import { authRouter } from "./modules/auth/auth.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { roleRouter } from "./modules/roles/role.routes";
import { sessionRouter } from "./modules/sessions/session.routes";
import { userRouter } from "./modules/users/user.routes";

export const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ success: true, message: "OK", database: "connected" });
  } catch {
    return res.status(503).json({
      success: false,
      message: "Database unavailable",
      database: "disconnected",
    });
  }
});
router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/users", userRouter);
router.use("/sessions", sessionRouter);
router.use("/roles", roleRouter);
