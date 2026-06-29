import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCalendarEventsQuery } from "./calendar.validation";
import { calendarService } from "./calendar.service";

export const listEvents = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCalendarEventsQuery>(req);
  const result = await calendarService.listEvents(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getEvent = asyncHandler(async (req, res) => {
  const item = await calendarService.getEventById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createEvent = asyncHandler(async (req, res) => {
  const item = await calendarService.createEvent(req.body, getAuthContext(req));
  return sendCreated(res, item, "Calendar event created");
});

export const updateEvent = asyncHandler(async (req, res) => {
  const item = await calendarService.updateEvent(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Calendar event updated");
});

export const deleteEvent = asyncHandler(async (req, res) => {
  await calendarService.deleteEvent(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Calendar event deleted");
});
