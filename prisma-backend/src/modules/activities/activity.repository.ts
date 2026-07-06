import type { ActivityHistoryAction, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { activitySelect } from "../../shared/utils/activity-mapper";

export type ActivityRecord = Prisma.ActivityGetPayload<{ select: typeof activitySelect }>;

export const activityRepository = {
  findMany(where: Prisma.ActivityWhereInput, skip: number, take: number, orderBy?: Prisma.ActivityOrderByWithRelationInput[]) {
    return prisma.activity.findMany({
      where,
      orderBy: orderBy ?? [{ dueAt: "asc" }, { createdAt: "desc" }],
      skip,
      take,
      select: activitySelect,
    });
  },

  count(where: Prisma.ActivityWhereInput) {
    return prisma.activity.count({ where });
  },

  findById(where: Prisma.ActivityWhereInput) {
    return prisma.activity.findFirst({ where, select: activitySelect });
  },

  create(data: Prisma.ActivityCreateInput) {
    return prisma.activity.create({ data, select: activitySelect });
  },

  update(id: string, data: Prisma.ActivityUpdateInput) {
    return prisma.activity.update({ where: { id }, data, select: activitySelect });
  },

  delete(id: string) {
    return prisma.activity.delete({ where: { id } });
  },

  listForExport(where: Prisma.ActivityWhereInput) {
    return prisma.activity.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      select: {
        type: true,
        status: true,
        priority: true,
        subject: true,
        body: true,
        dueAt: true,
        completedAt: true,
        reminderAt: true,
        location: true,
        contact: { select: { firstName: true, lastName: true, email: true } },
        deal: { select: { title: true } },
        company: { select: { name: true } },
        assignee: { select: { email: true } },
      },
    });
  },

  addHistory(data: {
    organizationId: string;
    activityId: string;
    userId?: string;
    action: ActivityHistoryAction;
    details?: Prisma.InputJsonValue;
  }) {
    return prisma.activityHistory.create({ data });
  },

  listHistory(activityId: string) {
    return prisma.activityHistory.findMany({
      where: { activityId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  },
};
