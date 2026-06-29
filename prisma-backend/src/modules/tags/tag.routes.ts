import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./tag.controller";
import { createTagSchema, listTagsQuerySchema, tagIdParamSchema, updateTagSchema } from "./tag.validation";

export const tagRouter = Router();

tagRouter.use(authenticate, resolveOrganization);

tagRouter.get(
  "/",
  requirePermission(Permissions.ReadContacts, Permissions.ReadDeals),
  validate({ query: listTagsQuerySchema }),
  controller.listTags,
);
tagRouter.post(
  "/",
  requirePermission(Permissions.ManageContacts, Permissions.ManageDeals),
  validate({ body: createTagSchema }),
  controller.createTag,
);
tagRouter.patch(
  "/:id",
  requirePermission(Permissions.ManageContacts, Permissions.ManageDeals),
  validate({ params: tagIdParamSchema, body: updateTagSchema }),
  controller.updateTag,
);
tagRouter.delete(
  "/:id",
  requirePermission(Permissions.ManageContacts, Permissions.ManageDeals),
  validate({ params: tagIdParamSchema }),
  controller.deleteTag,
);
