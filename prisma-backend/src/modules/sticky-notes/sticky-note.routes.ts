import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./sticky-note.controller";
import {
  createStickyNoteSchema,
  listStickyNotesQuerySchema,
  stickyNoteIdParamSchema,
  updateStickyNoteSchema,
} from "./sticky-note.validation";

export const stickyNoteRouter = Router();

const canRead = requirePermission(Permissions.ReadActivities);
const canManage = requirePermission(Permissions.ManageActivities);

stickyNoteRouter.use(authenticate, resolveOrganization);

stickyNoteRouter.get(
  "/",
  canRead,
  validate({ query: listStickyNotesQuerySchema }),
  controller.listStickyNotes,
);
stickyNoteRouter.post(
  "/",
  canManage,
  validate({ body: createStickyNoteSchema }),
  controller.createStickyNote,
);
stickyNoteRouter.get(
  "/:id",
  canRead,
  validate({ params: stickyNoteIdParamSchema }),
  controller.getStickyNote,
);
stickyNoteRouter.patch(
  "/:id",
  canManage,
  validate({ params: stickyNoteIdParamSchema, body: updateStickyNoteSchema }),
  controller.updateStickyNote,
);
stickyNoteRouter.delete(
  "/:id",
  canManage,
  validate({ params: stickyNoteIdParamSchema }),
  controller.deleteStickyNote,
);
