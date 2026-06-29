import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const calendarEventTypeSchema = z.enum(["MEETING", "TASK"]);

export const createCalendarEventSchema = z.object({
  userId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  type: calendarEventTypeSchema.optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
});

export const updateCalendarEventSchema = createCalendarEventSchema.partial();

export const calendarEventIdParamSchema = z.object({ id: z.string().uuid() });

export const listCalendarEventsQuerySchema = paginationQuerySchema.extend({
  userId: z.string().uuid().optional(),
  type: calendarEventTypeSchema.optional(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
export type ListCalendarEventsQuery = z.infer<typeof listCalendarEventsQuerySchema>;
