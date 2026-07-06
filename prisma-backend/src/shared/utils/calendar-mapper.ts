import type { Prisma } from "@prisma/client";

const ownerSelect = { id: true, email: true } as const;

export const calendarEventSelect = {
  id: true,
  organizationId: true,
  userId: true,
  title: true,
  type: true,
  status: true,
  description: true,
  location: true,
  timezone: true,
  isAllDay: true,
  startsAt: true,
  endsAt: true,
  contactId: true,
  dealId: true,
  companyId: true,
  leadId: true,
  activityId: true,
  seriesId: true,
  recurrenceFrequency: true,
  recurrenceInterval: true,
  recurrenceEndAt: true,
  syncProvider: true,
  externalCalendarId: true,
  externalEventId: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: ownerSelect },
  contact: { select: { id: true, firstName: true, lastName: true } },
  deal: { select: { id: true, title: true } },
  company: { select: { id: true, name: true } },
  attendees: {
    select: {
      id: true,
      userId: true,
      email: true,
      name: true,
      status: true,
      user: { select: ownerSelect },
    },
  },
} satisfies Prisma.CalendarEventSelect;

type CalendarEventRow = Prisma.CalendarEventGetPayload<{ select: typeof calendarEventSelect }>;

const mapOwner = (owner: { id: string; email: string | null } | null) =>
  owner ? { id: owner.id, email: owner.email } : null;

export const mapCalendarEvent = (event: CalendarEventRow) => ({
  id: event.id,
  organizationId: event.organizationId,
  userId: event.userId,
  title: event.title,
  type: event.type,
  status: event.status,
  description: event.description,
  location: event.location,
  timezone: event.timezone,
  isAllDay: event.isAllDay,
  startsAt: event.startsAt,
  endsAt: event.endsAt,
  contactId: event.contactId,
  dealId: event.dealId,
  companyId: event.companyId,
  leadId: event.leadId,
  activityId: event.activityId,
  seriesId: event.seriesId,
  recurrenceFrequency: event.recurrenceFrequency,
  recurrenceInterval: event.recurrenceInterval,
  recurrenceEndAt: event.recurrenceEndAt,
  syncProvider: event.syncProvider,
  externalCalendarId: event.externalCalendarId,
  externalEventId: event.externalEventId,
  lastSyncedAt: event.lastSyncedAt,
  user: mapOwner(event.user),
  contact: event.contact
    ? {
        id: event.contact.id,
        fullName: `${event.contact.firstName} ${event.contact.lastName}`.trim(),
      }
    : null,
  deal: event.deal,
  company: event.company,
  attendees: event.attendees.map((attendee) => ({
    id: attendee.id,
    userId: attendee.userId,
    email: attendee.email,
    name: attendee.name,
    status: attendee.status,
    user: mapOwner(attendee.user),
  })),
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
});

export const mapAvailabilityRule = (rule: {
  id: string;
  userId: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  timezone: string;
  isActive: boolean;
}) => ({
  id: rule.id,
  userId: rule.userId,
  dayOfWeek: rule.dayOfWeek,
  startMinutes: rule.startMinutes,
  endMinutes: rule.endMinutes,
  timezone: rule.timezone,
  isActive: rule.isActive,
});
