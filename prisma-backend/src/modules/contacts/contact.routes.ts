import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./contact.controller";
import {
  contactIdParamSchema,
  convertLeadSchema,
  createContactSchema,
  listContactsQuerySchema,
  updateContactSchema,
} from "./contact.validation";

export const contactRouter = Router();

const canRead = requirePermission(Permissions.ReadContacts);
const canManage = requirePermission(Permissions.ManageContacts);

contactRouter.use(authenticate, resolveOrganization);

contactRouter.get("/", canRead, validate({ query: listContactsQuerySchema }), controller.listContacts);
contactRouter.post("/", canManage, validate({ body: createContactSchema }), controller.createContact);
contactRouter.post(
  "/:id/convert",
  canManage,
  validate({ params: contactIdParamSchema, body: convertLeadSchema }),
  controller.convertLead,
);
contactRouter.get(
  "/:id",
  canRead,
  validate({ params: contactIdParamSchema }),
  controller.getContact,
);
contactRouter.patch(
  "/:id",
  canManage,
  validate({ params: contactIdParamSchema, body: updateContactSchema }),
  controller.updateContact,
);
contactRouter.delete(
  "/:id",
  canManage,
  validate({ params: contactIdParamSchema }),
  controller.deleteContact,
);
