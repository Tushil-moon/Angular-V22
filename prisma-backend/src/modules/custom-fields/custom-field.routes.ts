import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./custom-field.controller";
import {
  createCustomFieldSchema,
  customFieldIdParamSchema,
  listCustomFieldsQuerySchema,
  updateCustomFieldSchema,
} from "./custom-field.validation";

export const customFieldRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

customFieldRouter.use(authenticate, resolveOrganization);

customFieldRouter.get("/", canRead, validate({ query: listCustomFieldsQuerySchema }), controller.listFields);
customFieldRouter.post("/", canManage, validate({ body: createCustomFieldSchema }), controller.createField);
customFieldRouter.get("/:id", canRead, validate({ params: customFieldIdParamSchema }), controller.getField);
customFieldRouter.patch(
  "/:id",
  canManage,
  validate({ params: customFieldIdParamSchema, body: updateCustomFieldSchema }),
  controller.updateField,
);
customFieldRouter.delete("/:id", canManage, validate({ params: customFieldIdParamSchema }), controller.deleteField);
