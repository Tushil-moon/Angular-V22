import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { validate } from "../../middlewares/validate";
import * as controller from "./saved-view.controller";
import {
  createSavedViewSchema,
  listSavedViewsQuerySchema,
  savedViewIdParamSchema,
  updateSavedViewSchema,
} from "./saved-view.validation";

export const savedViewRouter = Router();

savedViewRouter.use(authenticate, resolveOrganization);
savedViewRouter.get("/", validate({ query: listSavedViewsQuerySchema }), controller.listSavedViews);
savedViewRouter.post("/", validate({ body: createSavedViewSchema }), controller.createSavedView);
savedViewRouter.patch(
  "/:id",
  validate({ params: savedViewIdParamSchema, body: updateSavedViewSchema }),
  controller.updateSavedView,
);
savedViewRouter.delete(
  "/:id",
  validate({ params: savedViewIdParamSchema }),
  controller.deleteSavedView,
);
