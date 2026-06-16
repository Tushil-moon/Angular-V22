import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Roles } from "../../shared/constants/roles";
import * as controller from "./contact.controller";
import {
  contactIdParamSchema,
  createContactSchema,
  listContactsQuerySchema,
  updateContactSchema,
} from "./contact.validation";

export const contactRouter = Router();

const canManage = authorize(Roles.Admin, Roles.Manager);

contactRouter.get("/", authenticate, validate({ query: listContactsQuerySchema }), controller.listContacts);
contactRouter.post("/", authenticate, canManage, validate({ body: createContactSchema }), controller.createContact);
contactRouter.get(
  "/:id",
  authenticate,
  validate({ params: contactIdParamSchema }),
  controller.getContact,
);
contactRouter.patch(
  "/:id",
  authenticate,
  canManage,
  validate({ params: contactIdParamSchema, body: updateContactSchema }),
  controller.updateContact,
);
contactRouter.delete(
  "/:id",
  authenticate,
  canManage,
  validate({ params: contactIdParamSchema }),
  controller.deleteContact,
);
