import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { activitySelect, mapActivity } from "../../shared/utils/crm-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import {
  assertLinkedRecordAccess,
  buildActivityScopeWhere,
  canManageActivityRecord,
} from "../../shared/utils/access-control";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import type {
  CreateActivityInput,
  ListActivitiesQuery,
  UpdateActivityInput,
} from "./activity.validation";

export const activityService = {
  async listActivities(query: ListActivitiesQuery, auth: AuthContext) {
    const scopeWhere = buildActivityScopeWhere(auth);
    const filters = {
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
    };

    if (query.contactId || query.dealId) {
      await assertLinkedRecordAccess(auth, query.contactId, query.dealId);
    }

    const where =
      Object.keys(scopeWhere).length > 0 && Object.keys(filters).length > 0
        ? { AND: [scopeWhere, filters] }
        : { ...scopeWhere, ...filters };

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

  async createActivity(input: CreateActivityInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    await assertLinkedRecordAccess(auth, input.contactId, input.dealId);

    const activity = await prisma.activity.create({
      data: {
        organizationId,
        type: input.type ?? "NOTE",
        subject: input.subject.trim(),
        body: input.body?.trim() || undefined,
        contactId: input.contactId,
        dealId: input.dealId,
        userId: auth.userId,
        dueAt: input.dueAt,
        completedAt: input.completedAt,
      },
      select: activitySelect,
    });

    return mapActivity(activity);
  },

  async updateActivity(id: string, input: UpdateActivityInput, auth: AuthContext) {
    const existing = await prisma.activity.findUnique({
      where: { id },
      select: { id: true, userId: true, contactId: true, dealId: true },
    });

    if (!existing) throw new AppError(404, "Activity not found", "ACTIVITY_NOT_FOUND");
    if (!canManageActivityRecord(auth, existing.userId)) {
      throw new AppError(403, "You do not have access to this activity", "FORBIDDEN");
    }

    if (input.contactId !== undefined || input.dealId !== undefined) {
      await assertLinkedRecordAccess(
        auth,
        input.contactId ?? existing.contactId ?? undefined,
        input.dealId ?? existing.dealId ?? undefined,
      );
    }

    const activity = await prisma.activity.update({
      where: { id },
      data: {
        type: input.type,
        subject: input.subject?.trim(),
        body: input.body?.trim(),
        contactId: input.contactId,
        dealId: input.dealId,
        dueAt: input.dueAt,
        completedAt: input.completedAt,
      },
      select: activitySelect,
    });

    return mapActivity(activity);
  },

  async deleteActivity(id: string, auth: AuthContext) {
    const existing = await prisma.activity.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing) throw new AppError(404, "Activity not found", "ACTIVITY_NOT_FOUND");
    if (!canManageActivityRecord(auth, existing.userId)) {
      throw new AppError(403, "You do not have access to this activity", "FORBIDDEN");
    }

    await prisma.activity.delete({ where: { id } });
  },
};
