import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { handleUpload, imageUpload } from "../../middlewares/upload";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./media.controller";
import { createMediaSchema, listMediaQuerySchema, mediaIdParamSchema, updateMediaSchema } from "./media.validation";

export const mediaRouter = Router();

const canRead = requirePermission(Permissions.ReadMedia, Permissions.ManageMedia);
const canManage = requirePermission(Permissions.ManageMedia);

mediaRouter.use(authenticate);

mediaRouter.get("/", canRead, validate({ query: listMediaQuerySchema }), controller.listMedia);
mediaRouter.post("/upload", canManage, handleUpload(imageUpload.single("file")), controller.uploadMedia);
mediaRouter.post("/", canManage, validate({ body: createMediaSchema }), controller.createMedia);
mediaRouter.get("/:id", canRead, validate({ params: mediaIdParamSchema }), controller.getMedia);
mediaRouter.patch(
  "/:id",
  canManage,
  validate({ params: mediaIdParamSchema, body: updateMediaSchema }),
  controller.updateMedia,
);
mediaRouter.delete("/:id", canManage, validate({ params: mediaIdParamSchema }), controller.deleteMedia);
