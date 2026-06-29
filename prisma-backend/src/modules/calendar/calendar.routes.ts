import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./calendar.controller";
import {
  calendarEventIdParamSchema,
  createCalendarEventSchema,
  listCalendarEventsQuerySchema,
  updateCalendarEventSchema,
} from "./calendar.validation";

export const calendarRouter = Router();

const canRead = requirePermission(Permissions.ReadActivities);
const canManage = requirePermission(Permissions.ManageActivities);

calendarRouter.use(authenticate, resolveOrganization);

calendarRouter.get("/", canRead, validate({ query: listCalendarEventsQuerySchema }), controller.listEvents);
calendarRouter.post("/", canManage, validate({ body: createCalendarEventSchema }), controller.createEvent);
calendarRouter.get("/:id", canRead, validate({ params: calendarEventIdParamSchema }), controller.getEvent);
calendarRouter.patch(
  "/:id",
  canManage,
  validate({ params: calendarEventIdParamSchema, body: updateCalendarEventSchema }),
  controller.updateEvent,
);
calendarRouter.delete("/:id", canManage, validate({ params: calendarEventIdParamSchema }), controller.deleteEvent);
