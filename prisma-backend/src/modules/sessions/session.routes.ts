import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { validate } from "../../middlewares/validate";
import * as controller from "./session.controller";
import { sessionIdParamSchema } from "./session.validation";

export const sessionRouter = Router();

sessionRouter.use(authenticate);
sessionRouter.get("/", controller.listSessions);
sessionRouter.delete("/:id", validate({ params: sessionIdParamSchema }), controller.revokeSession);
