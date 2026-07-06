import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCalendarEventsQuery, RangeCalendarEventsQuery } from "./calendar.validation";
import { calendarService } from "./calendar.service";

export const listEvents = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCalendarEventsQuery>(req);
  const result = await calendarService.listEvents(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const listEventsInRange = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<RangeCalendarEventsQuery>(req);
  const events = await calendarService.listEventsInRange(query, getAuthContext(req));
  return sendSuccess(res, events);
});

export const getAvailability = asyncHandler(async (req, res) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const rules = await calendarService.getAvailability(userId, getAuthContext(req));
  return sendSuccess(res, rules);
});

export const upsertAvailability = asyncHandler(async (req, res) => {
  const rules = await calendarService.upsertAvailability(req.body, getAuthContext(req));
  return sendSuccess(res, rules, "Availability updated");
});

export const exportIcs = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<RangeCalendarEventsQuery>(req);
  const ics = await calendarService.exportIcs(query, getAuthContext(req));
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="calendar.ics"');
  return res.status(200).send(ics);
});

export const getEvent = asyncHandler(async (req, res) => {
  const item = await calendarService.getEventById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const getEventHistory = asyncHandler(async (req, res) => {
  const history = await calendarService.getEventHistory(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, history);
});

export const createEvent = asyncHandler(async (req, res) => {
  const item = await calendarService.createEvent(req.body, getAuthContext(req));
  return sendCreated(res, item, "Calendar event created");
});

export const updateEvent = asyncHandler(async (req, res) => {
  const item = await calendarService.updateEvent(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Calendar event updated");
});

export const cancelEvent = asyncHandler(async (req, res) => {
  const item = await calendarService.cancelEvent(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item, "Calendar event cancelled");
});

export const deleteEvent = asyncHandler(async (req, res) => {
  await calendarService.deleteEvent(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Calendar event deleted");
});
