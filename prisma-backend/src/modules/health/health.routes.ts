import { Router } from "express";
import { getHealth, getLive, getReady } from "./health.controller";

export const healthRouter = Router();

healthRouter.get("/", getHealth);
healthRouter.get("/live", getLive);
healthRouter.get("/ready", getReady);
