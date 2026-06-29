import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateCalendarEventInput, ListCalendarEventsQuery, UpdateCalendarEventInput } from "./calendar.validation";

export const calendarService = {
  async listEvents(query: ListCalendarEventsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = {
      organizationId,
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.calendarEvent.findMany({ where, orderBy: { startsAt: "asc" }, skip, take: query.pageSize }),
      prisma.calendarEvent.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getEventById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.calendarEvent.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "Calendar event not found", "CALENDAR_EVENT_NOT_FOUND");
    return item;
  },

  async createEvent(input: CreateCalendarEventInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const userId = input.userId ?? auth.userId;
    return prisma.calendarEvent.create({ data: { ...input, userId, organizationId } });
  },

  async updateEvent(id: string, input: UpdateCalendarEventInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.calendarEvent.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Calendar event not found", "CALENDAR_EVENT_NOT_FOUND");
    return prisma.calendarEvent.update({ where: { id }, data: input });
  },

  async deleteEvent(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.calendarEvent.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Calendar event not found", "CALENDAR_EVENT_NOT_FOUND");
    await prisma.calendarEvent.delete({ where: { id } });
  },
};
