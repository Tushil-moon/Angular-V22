import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./contact.controller";
import {
  checkDuplicatesSchema,
  contactIdParamSchema,
  convertLeadSchema,
  createContactSchema,
  importContactsCsvSchema,
  importContactsSchema,
  listContactsQuerySchema,
  mergeContactsSchema,
  updateContactSchema,
} from "./contact.validation";

export const contactRouter = Router();

const canRead = requirePermission(Permissions.ReadContacts);
const canManage = requirePermission(Permissions.ManageContacts);

contactRouter.use(authenticate, resolveOrganization);

contactRouter.get("/", canRead, validate({ query: listContactsQuerySchema }), controller.listContacts);
contactRouter.get("/export", canRead, validate({ query: listContactsQuerySchema }), controller.exportContacts);
contactRouter.post("/check-duplicates", canRead, validate({ body: checkDuplicatesSchema }), controller.checkDuplicates);
contactRouter.post("/import", canManage, validate({ body: importContactsSchema }), controller.importContacts);
contactRouter.post("/import/csv", canManage, validate({ body: importContactsCsvSchema }), controller.importContactsCsv);
contactRouter.post("/", canManage, validate({ body: createContactSchema }), controller.createContact);
contactRouter.post(
  "/:id/convert",
  canManage,
  validate({ params: contactIdParamSchema, body: convertLeadSchema }),
  controller.convertLead,
);
contactRouter.get(
  "/:id/duplicates",
  canRead,
  validate({ params: contactIdParamSchema }),
  controller.getContactDuplicates,
);
contactRouter.post(
  "/:id/merge",
  canManage,
  validate({ params: contactIdParamSchema, body: mergeContactsSchema }),
  controller.mergeContacts,
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
