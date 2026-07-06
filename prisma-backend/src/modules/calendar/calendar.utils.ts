import type { Prisma } from "@prisma/client";

import type { AuthContext } from "../../shared/types/auth-context";
import type { ListCalendarEventsQuery, RangeCalendarEventsQuery } from "./calendar.validation";

export const DEFAULT_AVAILABILITY_RULES = [
  { dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 17 * 60 },
  { dayOfWeek: 2, startMinutes: 9 * 60, endMinutes: 17 * 60 },
  { dayOfWeek: 3, startMinutes: 9 * 60, endMinutes: 17 * 60 },
  { dayOfWeek: 4, startMinutes: 9 * 60, endMinutes: 17 * 60 },
  { dayOfWeek: 5, startMinutes: 9 * 60, endMinutes: 17 * 60 },
];

export const assertValidEventWindow = (startsAt: Date, endsAt: Date) => {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("End time must be after start time");
  }
};

export const buildCalendarListWhere = (
  query: ListCalendarEventsQuery,
  organizationId: string,
): Prisma.CalendarEventWhereInput => {
  const filters: Prisma.CalendarEventWhereInput = { organizationId };

  if (query.userId) filters.userId = query.userId;
  if (query.type) filters.type = query.type;
  if (query.status) filters.status = query.status;
  if (query.contactId) filters.contactId = query.contactId;
  if (query.dealId) filters.dealId = query.dealId;

  const search = query.search?.trim();
  if (search) {
    filters.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }

  return filters;
};

export const buildCalendarRangeWhere = (
  query: RangeCalendarEventsQuery,
  organizationId: string,
): Prisma.CalendarEventWhereInput => {
  const base = buildCalendarListWhere(
    {
      page: 1,
      pageSize: 100,
      userId: query.userId,
      type: query.type,
      status: query.status,
      contactId: query.contactId,
      dealId: query.dealId,
      search: query.search,
    },
    organizationId,
  );

  return {
    ...base,
    ...(!query.includeCancelled && !query.status ? { status: { not: "CANCELLED" } } : {}),
    startsAt: { lt: query.end },
    endsAt: { gt: query.start },
  };
};

const formatIcsDate = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export const eventsToIcs = (
  events: Array<{
    id: string;
    title: string;
    description?: string | null;
    location?: string | null;
    startsAt: Date;
    endsAt: Date;
    status: string;
  }>,
): string => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Enterprise CRM//Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    if (event.status === "CANCELLED") continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@enterprise-crm`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(event.startsAt)}`,
      `DTEND:${formatIcsDate(event.endsAt)}`,
      `SUMMARY:${event.title.replace(/[,;\\]/g, " ")}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`);
    if (event.location) lines.push(`LOCATION:${event.location.replace(/[,;\\]/g, " ")}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
};

export const canManageCalendarEvent = (auth: AuthContext, ownerUserId: string) =>
  auth.userId === ownerUserId ||
  auth.roles.includes("Admin") ||
  auth.roles.includes("Manager") ||
  auth.permissions.includes("manage:activities");
