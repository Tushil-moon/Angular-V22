import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./media.controller";
import { createMediaSchema, listMediaQuerySchema, mediaIdParamSchema } from "./media.validation";

export const mediaRouter = Router();

const canRead = requirePermission(Permissions.ReadMedia, Permissions.ManageMedia);
const canManage = requirePermission(Permissions.ManageMedia);

mediaRouter.use(authenticate);

mediaRouter.get("/", canRead, validate({ query: listMediaQuerySchema }), controller.listMedia);
mediaRouter.post("/", canManage, validate({ body: createMediaSchema }), controller.createMedia);
mediaRouter.get("/:id", canRead, validate({ params: mediaIdParamSchema }), controller.getMedia);
