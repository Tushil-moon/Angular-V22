import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Roles } from "../../shared/constants/roles";
import * as controller from "./role.controller";
import { assignRoleSchema, createRoleSchema, removeRoleSchema } from "./role.validation";

export const roleRouter = Router();

roleRouter.use(authenticate);
roleRouter.get("/", controller.listRoles);
roleRouter.post("/", authorize(Roles.Admin), validate({ body: createRoleSchema }), controller.createRole);
roleRouter.post("/assign", authorize(Roles.Admin), validate({ body: assignRoleSchema }), controller.assignRole);
roleRouter.post("/remove", authorize(Roles.Admin), validate({ body: removeRoleSchema }), controller.removeRole);
