import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as controller from "./session.controller";

export const sessionRouter = Router();

sessionRouter.use(authenticate);
sessionRouter.get("/", controller.listSessions);
sessionRouter.delete("/:id", validate({ params: z.object({ id: z.string().uuid() }) }), controller.revokeSession);
