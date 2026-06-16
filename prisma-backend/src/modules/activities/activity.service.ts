import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { activitySelect, mapActivity } from "../../shared/utils/crm-mapper";
import type { CreateActivityInput, ListActivitiesQuery } from "./activity.validation";

export const activityService = {
  async listActivities(query: ListActivitiesQuery) {
    const where = {
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [activities, total] = await prisma.$transaction([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: query.pageSize,
        select: activitySelect,
      }),
      prisma.activity.count({ where }),
    ]);

    return {
      data: activities.map(mapActivity),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async createActivity(input: CreateActivityInput, userId: string) {
    if (input.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: input.contactId, deletedAt: null },
      });
      if (!contact) throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    }

    if (input.dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: input.dealId, deletedAt: null },
      });
      if (!deal) throw new AppError(404, "Deal not found", "DEAL_NOT_FOUND");
    }

    const activity = await prisma.activity.create({
      data: {
        type: input.type ?? "NOTE",
        subject: input.subject.trim(),
        body: input.body?.trim() || undefined,
        contactId: input.contactId,
        dealId: input.dealId,
        userId,
      },
      select: activitySelect,
    });

    return mapActivity(activity);
  },
};
