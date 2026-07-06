import { randomUUID } from "node:crypto";

import type { CalendarHistoryAction, Prisma } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error";
import { mapAvailabilityRule, mapCalendarEvent } from "../../shared/utils/calendar-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { calendarRepository } from "./calendar.repository";
import {
  buildCalendarListWhere,
  buildCalendarRangeWhere,
  canManageCalendarEvent,
  DEFAULT_AVAILABILITY_RULES,
  eventsToIcs,
} from "./calendar.utils";
import type {
  CreateCalendarEventInput,
  ListCalendarEventsQuery,
  RangeCalendarEventsQuery,
  UpdateCalendarEventInput,
  UpsertAvailabilityInput,
} from "./calendar.validation";

const recordHistory = async (
  auth: AuthContext,
  eventId: string,
  action: CalendarHistoryAction,
  details?: Prisma.InputJsonValue,
) => {
  const organizationId = requireOrganizationContext(auth);
  await calendarRepository.addHistory({
    organizationId,
    eventId,
    userId: auth.userId,
    action,
    details: details ?? {},
  });
};

const buildRecurrenceFields = (recurrence: CreateCalendarEventInput["recurrence"]) => {
  if (!recurrence) {
    return {
      seriesId: null as string | null,
      recurrenceFrequency: null,
      recurrenceInterval: null,
      recurrenceEndAt: null,
    };
  }

  return {
    seriesId: randomUUID(),
    recurrenceFrequency: recurrence.frequency,
    recurrenceInterval: recurrence.interval ?? 1,
    recurrenceEndAt: recurrence.endAt ?? null,
  };
};

const buildSyncFields = (sync: CreateCalendarEventInput["sync"]) => {
  if (!sync) {
    return {
      syncProvider: "INTERNAL" as const,
      externalCalendarId: null,
      externalEventId: null,
      lastSyncedAt: null,
    };
  }

  return {
    syncProvider: sync.provider ?? "INTERNAL",
    externalCalendarId: sync.externalCalendarId ?? null,
    externalEventId: sync.externalEventId ?? null,
    lastSyncedAt: sync.lastSyncedAt ?? null,
  };
};

export const calendarService = {
  async listEvents(query: ListCalendarEventsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildCalendarListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      calendarRepository.findMany(where, skip, query.pageSize),
      calendarRepository.count(where),
    ]);

    return {
      data: data.map(mapCalendarEvent),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async listEventsInRange(query: RangeCalendarEventsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildCalendarRangeWhere(query, organizationId);
    const events = await calendarRepository.findInRange(where);
    return events.map(mapCalendarEvent);
  },

  async getAvailability(userId: string | undefined, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const targetUserId = userId ?? auth.userId;
    let rules = await calendarRepository.listAvailability(targetUserId, organizationId);

    if (rules.length === 0) {
      rules = await calendarRepository.replaceAvailability(
        targetUserId,
        organizationId,
        DEFAULT_AVAILABILITY_RULES,
      );
    }

    return rules.map(mapAvailabilityRule);
  },

  async upsertAvailability(input: UpsertAvailabilityInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const userId = input.userId ?? auth.userId;
    const rules = await calendarRepository.replaceAvailability(userId, organizationId, input.rules);
    return rules.map(mapAvailabilityRule);
  },

  async exportIcs(query: RangeCalendarEventsQuery, auth: AuthContext) {
    const events = await this.listEventsInRange({ ...query, includeCancelled: false }, auth);
    return eventsToIcs(events);
  },

  async getEventById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await calendarRepository.findById({ id, organizationId });
    if (!item) throw new AppError(404, "Calendar event not found", "CALENDAR_EVENT_NOT_FOUND");
    return mapCalendarEvent(item);
  },

  async getEventHistory(id: string, auth: AuthContext) {
    await this.getEventById(id, auth);
    const history = await calendarRepository.listHistory(id);
    return history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      details: entry.details,
      createdAt: entry.createdAt,
      user: entry.user,
    }));
  },

  async createEvent(input: CreateCalendarEventInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const userId = input.userId ?? auth.userId;
    const recurrenceFields = buildRecurrenceFields(input.recurrence);
    const syncFields = buildSyncFields(input.sync);

    const event = await calendarRepository.create({
      organization: { connect: { id: organizationId } },
      user: { connect: { id: userId } },
      title: input.title.trim(),
      type: input.type ?? "MEETING",
      status: input.status ?? "CONFIRMED",
      description: input.description?.trim(),
      location: input.location?.trim(),
      timezone: input.timezone ?? "UTC",
      isAllDay: input.isAllDay ?? false,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      contact: input.contactId ? { connect: { id: input.contactId } } : undefined,
      deal: input.dealId ? { connect: { id: input.dealId } } : undefined,
      company: input.companyId ? { connect: { id: input.companyId } } : undefined,
      lead: input.leadId ? { connect: { id: input.leadId } } : undefined,
      activity: input.activityId ? { connect: { id: input.activityId } } : undefined,
      ...recurrenceFields,
      syncProvider: syncFields.syncProvider,
      externalCalendarId: syncFields.externalCalendarId ?? undefined,
      externalEventId: syncFields.externalEventId ?? undefined,
      lastSyncedAt: syncFields.lastSyncedAt ?? undefined,
    });

    if (input.attendees?.length) {
      await calendarRepository.replaceAttendees(event.id, organizationId, input.attendees);
      await recordHistory(auth, event.id, "ATTENDEE_ADDED", { count: input.attendees.length });
    }

    await recordHistory(auth, event.id, "CREATED");
    if (syncFields.externalEventId) {
      await recordHistory(auth, event.id, "SYNC_UPDATED", syncFields as Prisma.InputJsonValue);
    }

    const refreshed = await calendarRepository.findById({ id: event.id, organizationId });
    return mapCalendarEvent(refreshed!);
  },

  async updateEvent(id: string, input: UpdateCalendarEventInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await calendarRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Calendar event not found", "CALENDAR_EVENT_NOT_FOUND");
    if (!canManageCalendarEvent(auth, existing.userId)) {
      throw new AppError(403, "You do not have access to this event", "FORBIDDEN");
    }

    if (input.startsAt && input.endsAt && input.endsAt.getTime() <= input.startsAt.getTime()) {
      throw new AppError(400, "End time must be after start time", "INVALID_EVENT_WINDOW");
    }

    const recurrenceFields =
      input.recurrence === null
        ? {
            seriesId: null,
            recurrenceFrequency: null,
            recurrenceInterval: null,
            recurrenceEndAt: null,
          }
        : input.recurrence
          ? buildRecurrenceFields(input.recurrence)
          : {};

    const syncFields =
      input.sync === null
        ? {
            syncProvider: "INTERNAL" as const,
            externalCalendarId: null,
            externalEventId: null,
            lastSyncedAt: null,
          }
        : input.sync
          ? buildSyncFields(input.sync)
          : {};

    const event = await calendarRepository.update(id, {
      user: input.userId ? { connect: { id: input.userId } } : undefined,
      title: input.title?.trim(),
      type: input.type,
      status: input.status,
      description: input.description === null ? null : input.description?.trim(),
      location: input.location === null ? null : input.location?.trim(),
      timezone: input.timezone,
      isAllDay: input.isAllDay,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      contact:
        input.contactId === null
          ? { disconnect: true }
          : input.contactId
            ? { connect: { id: input.contactId } }
            : undefined,
      deal:
        input.dealId === null
          ? { disconnect: true }
          : input.dealId
            ? { connect: { id: input.dealId } }
            : undefined,
      company:
        input.companyId === null
          ? { disconnect: true }
          : input.companyId
            ? { connect: { id: input.companyId } }
            : undefined,
      lead:
        input.leadId === null
          ? { disconnect: true }
          : input.leadId
            ? { connect: { id: input.leadId } }
            : undefined,
      activity:
        input.activityId === null
          ? { disconnect: true }
          : input.activityId
            ? { connect: { id: input.activityId } }
            : undefined,
      ...recurrenceFields,
      ...(input.sync !== undefined ? syncFields : {}),
    });

    if (input.attendees) {
      await calendarRepository.replaceAttendees(id, organizationId, input.attendees);
      await recordHistory(auth, id, "ATTENDEE_ADDED", { count: input.attendees.length });
    }

    const action =
      input.startsAt || input.endsAt ? ("RESCHEDULED" as const) : ("UPDATED" as const);
    await recordHistory(auth, id, action, input as Prisma.InputJsonValue);
    if (input.sync) await recordHistory(auth, id, "SYNC_UPDATED", input.sync as Prisma.InputJsonValue);

    return mapCalendarEvent(event);
  },

  async cancelEvent(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await calendarRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Calendar event not found", "CALENDAR_EVENT_NOT_FOUND");
    if (!canManageCalendarEvent(auth, existing.userId)) {
      throw new AppError(403, "You do not have access to this event", "FORBIDDEN");
    }

    const event = await calendarRepository.update(id, { status: "CANCELLED" });
    await recordHistory(auth, id, "CANCELLED");
    return mapCalendarEvent(event);
  },

  async deleteEvent(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await calendarRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Calendar event not found", "CALENDAR_EVENT_NOT_FOUND");
    if (!canManageCalendarEvent(auth, existing.userId)) {
      throw new AppError(403, "You do not have access to this event", "FORBIDDEN");
    }

    await calendarRepository.delete(id);
  },
};
