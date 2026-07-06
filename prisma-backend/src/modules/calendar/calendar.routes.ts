import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./calendar.controller";
import {
  availabilityQuerySchema,
  calendarEventIdParamSchema,
  createCalendarEventSchema,
  exportCalendarQuerySchema,
  listCalendarEventsQuerySchema,
  rangeCalendarEventsQuerySchema,
  updateCalendarEventSchema,
  upsertAvailabilitySchema,
} from "./calendar.validation";

export const calendarRouter = Router();

const canRead = requirePermission(Permissions.ReadActivities);
const canManage = requirePermission(Permissions.ManageActivities);

calendarRouter.use(authenticate, resolveOrganization);

calendarRouter.get(
  "/",
  canRead,
  validate({ query: listCalendarEventsQuerySchema }),
  controller.listEvents,
);
calendarRouter.get(
  "/range",
  canRead,
  validate({ query: rangeCalendarEventsQuerySchema }),
  controller.listEventsInRange,
);
calendarRouter.get(
  "/availability",
  canRead,
  validate({ query: availabilityQuerySchema }),
  controller.getAvailability,
);
calendarRouter.put(
  "/availability",
  canManage,
  validate({ body: upsertAvailabilitySchema }),
  controller.upsertAvailability,
);
calendarRouter.get(
  "/export/ics",
  canRead,
  validate({ query: exportCalendarQuerySchema }),
  controller.exportIcs,
);
calendarRouter.post(
  "/",
  canManage,
  validate({ body: createCalendarEventSchema }),
  controller.createEvent,
);
calendarRouter.get(
  "/:id",
  canRead,
  validate({ params: calendarEventIdParamSchema }),
  controller.getEvent,
);
calendarRouter.get(
  "/:id/history",
  canRead,
  validate({ params: calendarEventIdParamSchema }),
  controller.getEventHistory,
);
calendarRouter.patch(
  "/:id",
  canManage,
  validate({ params: calendarEventIdParamSchema, body: updateCalendarEventSchema }),
  controller.updateEvent,
);
calendarRouter.post(
  "/:id/cancel",
  canManage,
  validate({ params: calendarEventIdParamSchema }),
  controller.cancelEvent,
);
calendarRouter.delete(
  "/:id",
  canManage,
  validate({ params: calendarEventIdParamSchema }),
  controller.deleteEvent,
);
