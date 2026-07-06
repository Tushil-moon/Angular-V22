import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const calendarEventTypeSchema = z.enum([
  "MEETING",
  "TASK",
  "CALL",
  "REMINDER",
  "OUT_OF_OFFICE",
]);
export const calendarEventStatusSchema = z.enum(["CONFIRMED", "TENTATIVE", "CANCELLED"]);
export const calendarSyncProviderSchema = z.enum(["INTERNAL", "GOOGLE", "OUTLOOK", "ICAL"]);
export const recurrenceFrequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);

const attendeeSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  name: z.string().max(200).optional(),
});

const recurrenceSchema = z
  .object({
    frequency: recurrenceFrequencySchema,
    interval: z.number().int().min(1).max(365).optional(),
    endAt: z.coerce.date().optional(),
  })
  .optional();

const syncSchema = z
  .object({
    provider: calendarSyncProviderSchema.optional(),
    externalCalendarId: z.string().max(200).optional(),
    externalEventId: z.string().max(200).optional(),
    lastSyncedAt: z.coerce.date().optional(),
  })
  .optional();

export const createCalendarEventSchema = z
  .object({
    userId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(200),
    type: calendarEventTypeSchema.optional(),
    status: calendarEventStatusSchema.optional(),
    description: z.string().max(5000).optional(),
    location: z.string().max(500).optional(),
    timezone: z.string().max(100).optional(),
    isAllDay: z.boolean().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    contactId: z.string().uuid().optional(),
    dealId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    activityId: z.string().uuid().optional(),
    attendees: z.array(attendeeSchema).optional(),
    recurrence: recurrenceSchema,
    sync: syncSchema,
  })
  .refine((data) => data.endsAt.getTime() > data.startsAt.getTime(), {
    message: "End time must be after start time",
    path: ["endsAt"],
  });

export const updateCalendarEventSchema = z
  .object({
    userId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    type: calendarEventTypeSchema.optional(),
    status: calendarEventStatusSchema.optional(),
    description: z.string().max(5000).nullable().optional(),
    location: z.string().max(500).nullable().optional(),
    timezone: z.string().max(100).optional(),
    isAllDay: z.boolean().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    contactId: z.string().uuid().nullable().optional(),
    dealId: z.string().uuid().nullable().optional(),
    companyId: z.string().uuid().nullable().optional(),
    leadId: z.string().uuid().nullable().optional(),
    activityId: z.string().uuid().nullable().optional(),
    attendees: z.array(attendeeSchema).optional(),
    recurrence: recurrenceSchema.nullable(),
    sync: syncSchema.nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const calendarEventIdParamSchema = z.object({ id: z.string().uuid() });

export const listCalendarEventsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  userId: z.string().uuid().optional(),
  type: calendarEventTypeSchema.optional(),
  status: calendarEventStatusSchema.optional(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
});

export const rangeCalendarEventsQuerySchema = listCalendarEventsQuerySchema
  .omit({ page: true, pageSize: true })
  .extend({
    start: z.coerce.date(),
    end: z.coerce.date(),
    includeCancelled: z.coerce.boolean().optional(),
  });

export const exportCalendarQuerySchema = rangeCalendarEventsQuerySchema;

export const availabilityQuerySchema = z.object({
  userId: z.string().uuid().optional(),
});

export const upsertAvailabilitySchema = z.object({
  userId: z.string().uuid().optional(),
  rules: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startMinutes: z.number().int().min(0).max(1439),
        endMinutes: z.number().int().min(1).max(1440),
        timezone: z.string().max(100).optional(),
      }),
    )
    .min(1),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
export type ListCalendarEventsQuery = z.infer<typeof listCalendarEventsQuerySchema>;
export type RangeCalendarEventsQuery = z.infer<typeof rangeCalendarEventsQuerySchema>;
export type UpsertAvailabilityInput = z.infer<typeof upsertAvailabilitySchema>;
