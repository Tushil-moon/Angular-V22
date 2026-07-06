import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./email-sequence.controller";
import {
  createEmailSequenceSchema,
  emailSequenceIdParamSchema,
  listEmailSequencesQuerySchema,
  updateEmailSequenceSchema,
} from "./email-sequence.validation";

export const emailSequenceRouter = Router();

const canRead = requirePermission(Permissions.ReadContacts);
const canManage = requirePermission(Permissions.ManageContacts);

emailSequenceRouter.use(authenticate, resolveOrganization);

emailSequenceRouter.get("/", canRead, validate({ query: listEmailSequencesQuerySchema }), controller.listSequences);
emailSequenceRouter.post("/", canManage, validate({ body: createEmailSequenceSchema }), controller.createSequence);
emailSequenceRouter.get("/:id", canRead, validate({ params: emailSequenceIdParamSchema }), controller.getSequence);
emailSequenceRouter.patch(
  "/:id",
  canManage,
  validate({ params: emailSequenceIdParamSchema, body: updateEmailSequenceSchema }),
  controller.updateSequence,
);
emailSequenceRouter.delete("/:id", canManage, validate({ params: emailSequenceIdParamSchema }), controller.deleteSequence);
