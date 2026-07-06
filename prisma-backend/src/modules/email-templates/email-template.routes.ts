import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./email-template.controller";
import {
  createEmailTemplateSchema,
  emailTemplateIdParamSchema,
  listEmailTemplatesQuerySchema,
  updateEmailTemplateSchema,
} from "./email-template.validation";

export const emailTemplateRouter = Router();

const canRead = requirePermission(Permissions.ReadContacts);
const canManage = requirePermission(Permissions.ManageContacts);

emailTemplateRouter.use(authenticate, resolveOrganization);

emailTemplateRouter.get("/", canRead, validate({ query: listEmailTemplatesQuerySchema }), controller.listTemplates);
emailTemplateRouter.post("/", canManage, validate({ body: createEmailTemplateSchema }), controller.createTemplate);
emailTemplateRouter.get("/:id", canRead, validate({ params: emailTemplateIdParamSchema }), controller.getTemplate);
emailTemplateRouter.patch(
  "/:id",
  canManage,
  validate({ params: emailTemplateIdParamSchema, body: updateEmailTemplateSchema }),
  controller.updateTemplate,
);
emailTemplateRouter.delete("/:id", canManage, validate({ params: emailTemplateIdParamSchema }), controller.deleteTemplate);
