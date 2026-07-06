import type { CalendarHistoryAction, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { calendarEventSelect } from "../../shared/utils/calendar-mapper";

export const calendarRepository = {
  findMany(where: Prisma.CalendarEventWhereInput, skip: number, take: number) {
    return prisma.calendarEvent.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip,
      take,
      select: calendarEventSelect,
    });
  },

  findInRange(where: Prisma.CalendarEventWhereInput) {
    return prisma.calendarEvent.findMany({
      where,
      orderBy: { startsAt: "asc" },
      select: calendarEventSelect,
    });
  },

  count(where: Prisma.CalendarEventWhereInput) {
    return prisma.calendarEvent.count({ where });
  },

  findById(where: Prisma.CalendarEventWhereInput) {
    return prisma.calendarEvent.findFirst({ where, select: calendarEventSelect });
  },

  create(data: Prisma.CalendarEventCreateInput) {
    return prisma.calendarEvent.create({ data, select: calendarEventSelect });
  },

  update(id: string, data: Prisma.CalendarEventUpdateInput) {
    return prisma.calendarEvent.update({ where: { id }, data, select: calendarEventSelect });
  },

  delete(id: string) {
    return prisma.calendarEvent.delete({ where: { id } });
  },

  replaceAttendees(eventId: string, organizationId: string, attendees: Array<{ userId?: string; email?: string; name?: string }>) {
    return prisma.$transaction(async (tx) => {
      await tx.calendarEventAttendee.deleteMany({ where: { eventId } });
      if (attendees.length === 0) return [];

      await tx.calendarEventAttendee.createMany({
        data: attendees.map((attendee) => ({
          organizationId,
          eventId,
          userId: attendee.userId,
          email: attendee.email,
          name: attendee.name,
        })),
      });

      return tx.calendarEventAttendee.findMany({ where: { eventId } });
    });
  },

  listAvailability(userId: string, organizationId: string) {
    return prisma.calendarAvailabilityRule.findMany({
      where: { userId, organizationId, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
    });
  },

  replaceAvailability(
    userId: string,
    organizationId: string,
    rules: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number; timezone?: string }>,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.calendarAvailabilityRule.deleteMany({ where: { userId, organizationId } });
      if (rules.length === 0) return [];

      await tx.calendarAvailabilityRule.createMany({
        data: rules.map((rule) => ({
          organizationId,
          userId,
          dayOfWeek: rule.dayOfWeek,
          startMinutes: rule.startMinutes,
          endMinutes: rule.endMinutes,
          timezone: rule.timezone ?? "UTC",
        })),
      });

      return tx.calendarAvailabilityRule.findMany({
        where: { userId, organizationId },
        orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
      });
    });
  },

  addHistory(data: {
    organizationId: string;
    eventId: string;
    userId?: string;
    action: CalendarHistoryAction;
    details?: Prisma.InputJsonValue;
  }) {
    return prisma.calendarEventHistory.create({ data });
  },

  listHistory(eventId: string) {
    return prisma.calendarEventHistory.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true } } },
    });
  },
};
