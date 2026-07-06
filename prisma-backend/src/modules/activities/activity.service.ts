import { randomUUID } from "node:crypto";

import type { ActivityHistoryAction, ActivityType, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { mapActivity } from "../../shared/utils/activity-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import {
  assertActivityLinksAccess,
  buildActivityScopeWhere,
  canManageActivityRecord,
} from "../../shared/utils/access-control";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { activityRepository } from "./activity.repository";
import {
  activitiesToCsv,
  buildActivityListWhere,
  calculateNextDueDate,
  parseCsvActivities,
  resolveInitialStatus,
} from "./activity.utils";
import type {
  CreateActivityInput,
  ImportActivitiesCsvInput,
  ListActivitiesQuery,
  TimelineQuery,
  UpdateActivityInput,
} from "./activity.validation";

const recordHistory = async (
  auth: AuthContext,
  activityId: string,
  action: ActivityHistoryAction,
  details?: Prisma.InputJsonValue,
) => {
  const organizationId = requireOrganizationContext(auth);
  await activityRepository.addHistory({
    organizationId,
    activityId,
    userId: auth.userId,
    action,
    details: details ?? {},
  });
};

const resolveAssigneeId = (input: CreateActivityInput, auth: AuthContext) =>
  input.assigneeId ?? auth.userId;

const buildRecurrenceFields = (
  recurrence: CreateActivityInput["recurrence"],
  seriesId?: string,
) => {
  if (!recurrence) {
    return {
      seriesId: null as string | null,
      recurrenceFrequency: null,
      recurrenceInterval: null,
      recurrenceEndAt: null,
      isRecurrenceTemplate: false,
    };
  }

  return {
    seriesId: seriesId ?? randomUUID(),
    recurrenceFrequency: recurrence.frequency,
    recurrenceInterval: recurrence.interval ?? 1,
    recurrenceEndAt: recurrence.endAt ?? null,
    isRecurrenceTemplate: true,
  };
};

const spawnNextRecurrence = async (
  activity: Awaited<ReturnType<typeof activityRepository.findById>>,
  auth: AuthContext,
) => {
  if (!activity || !activity.recurrenceFrequency || !activity.dueAt) {
    return null;
  }

  const nextDueAt = calculateNextDueDate(
    activity.dueAt,
    activity.recurrenceFrequency,
    activity.recurrenceInterval ?? 1,
  );

  if (activity.recurrenceEndAt && nextDueAt.getTime() > activity.recurrenceEndAt.getTime()) {
    return null;
  }

  const organizationId = requireOrganizationContext(auth);
  const next = await activityRepository.create({
    organization: { connect: { id: organizationId } },
    user: { connect: { id: activity.userId } },
    assignee: activity.assigneeId ? { connect: { id: activity.assigneeId } } : undefined,
    type: activity.type,
    status: "PENDING",
    priority: activity.priority,
    subject: activity.subject,
    body: activity.body ?? undefined,
    contact: activity.contactId ? { connect: { id: activity.contactId } } : undefined,
    deal: activity.dealId ? { connect: { id: activity.dealId } } : undefined,
    company: activity.companyId ? { connect: { id: activity.companyId } } : undefined,
    lead: activity.leadId ? { connect: { id: activity.leadId } } : undefined,
    dueAt: nextDueAt,
    reminderAt: activity.reminderAt
      ? calculateNextDueDate(activity.reminderAt, activity.recurrenceFrequency, activity.recurrenceInterval ?? 1)
      : undefined,
    durationMinutes: activity.durationMinutes ?? undefined,
    location: activity.location ?? undefined,
    seriesId: activity.seriesId ?? activity.id,
    recurrenceFrequency: activity.recurrenceFrequency,
    recurrenceInterval: activity.recurrenceInterval ?? 1,
    recurrenceEndAt: activity.recurrenceEndAt ?? undefined,
    isRecurrenceTemplate: false,
  });

  await recordHistory(auth, next.id, "CREATED", {
    sourceActivityId: activity.id,
    recurrence: true,
  });

  return mapActivity(next);
};

export const activityService = {
  async listActivities(query: ListActivitiesQuery, auth: AuthContext) {
    if (query.contactId || query.dealId || query.companyId || query.leadId) {
      await assertActivityLinksAccess(auth, {
        contactId: query.contactId,
        dealId: query.dealId,
        companyId: query.companyId,
        leadId: query.leadId,
      });
    }

    const where = buildActivityListWhere(query, auth);
    const skip = (query.page - 1) * query.pageSize;
    const [activities, total] = await Promise.all([
      activityRepository.findMany(where, skip, query.pageSize),
      activityRepository.count(where),
    ]);

    return {
      data: activities.map(mapActivity),
      ...buildPaginationMeta(total, query.page, query.pageSize),
    };
  },

  async getTimeline(query: TimelineQuery, auth: AuthContext) {
    if (!query.contactId && !query.dealId && !query.companyId && !query.leadId) {
      throw new AppError(400, "Timeline requires a linked record", "INVALID_TIMELINE_QUERY");
    }

    await assertActivityLinksAccess(auth, query);

    const where = buildActivityListWhere(
      {
        page: 1,
        pageSize: query.limit ?? 50,
        ...query,
      },
      auth,
    );

    const activities = await activityRepository.findMany(where, 0, query.limit ?? 50, [
      { dueAt: "desc" },
      { createdAt: "desc" },
    ]);

    return activities.map(mapActivity);
  },

  async createActivity(input: CreateActivityInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    await assertActivityLinksAccess(auth, input);

    const type = (input.type ?? "NOTE") as ActivityType;
    const assigneeId = resolveAssigneeId(input, auth);
    const status =
      input.status ?? resolveInitialStatus(type, input.completedAt ?? null, input.dueAt ?? null);
    const recurrenceFields = buildRecurrenceFields(input.recurrence);

    const activity = await activityRepository.create({
      organization: { connect: { id: organizationId } },
      user: { connect: { id: auth.userId } },
      assignee: { connect: { id: assigneeId } },
      type,
      status,
      priority: input.priority ?? "NORMAL",
      subject: input.subject.trim(),
      body: input.body?.trim() || undefined,
      contact: input.contactId ? { connect: { id: input.contactId } } : undefined,
      deal: input.dealId ? { connect: { id: input.dealId } } : undefined,
      company: input.companyId ? { connect: { id: input.companyId } } : undefined,
      lead: input.leadId ? { connect: { id: input.leadId } } : undefined,
      dueAt: input.dueAt,
      startedAt: input.startedAt,
      completedAt: input.completedAt ?? (status === "COMPLETED" ? new Date() : undefined),
      reminderAt: input.reminderAt,
      durationMinutes: input.durationMinutes,
      location: input.location?.trim() || undefined,
      ...recurrenceFields,
    });

    await recordHistory(auth, activity.id, "CREATED");
    if (input.reminderAt) {
      await recordHistory(auth, activity.id, "REMINDER_SET", { reminderAt: input.reminderAt });
    }
    if (input.recurrence) {
      await recordHistory(auth, activity.id, "RECURRENCE_UPDATED", input.recurrence as Prisma.InputJsonValue);
    }

    return mapActivity(activity);
  },

  async getActivity(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const scopeWhere = buildActivityScopeWhere(auth);

    const activity = await activityRepository.findById({
      id,
      organizationId,
      ...(Object.keys(scopeWhere).length > 0 ? scopeWhere : {}),
    });

    if (!activity) throw new AppError(404, "Activity not found", "ACTIVITY_NOT_FOUND");
    return mapActivity(activity);
  },

  async getActivityHistory(id: string, auth: AuthContext) {
    await this.getActivity(id, auth);
    const history = await activityRepository.listHistory(id);
    return history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      details: entry.details,
      createdAt: entry.createdAt,
      user: entry.user,
    }));
  },

  async updateActivity(id: string, input: UpdateActivityInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await activityRepository.findById({ id, organizationId });

    if (!existing) throw new AppError(404, "Activity not found", "ACTIVITY_NOT_FOUND");
    if (!canManageActivityRecord(auth, existing.userId, existing.assigneeId)) {
      throw new AppError(403, "You do not have access to this activity", "FORBIDDEN");
    }

    if (
      input.contactId !== undefined ||
      input.dealId !== undefined ||
      input.companyId !== undefined ||
      input.leadId !== undefined
    ) {
      await assertActivityLinksAccess(auth, {
        contactId: input.contactId ?? existing.contactId ?? undefined,
        dealId: input.dealId ?? existing.dealId ?? undefined,
        companyId: input.companyId ?? existing.companyId ?? undefined,
        leadId: input.leadId ?? existing.leadId ?? undefined,
      });
    }

    const recurrenceFields =
      input.recurrence === null
        ? {
            seriesId: null,
            recurrenceFrequency: null,
            recurrenceInterval: null,
            recurrenceEndAt: null,
            isRecurrenceTemplate: false,
          }
        : input.recurrence
          ? buildRecurrenceFields(input.recurrence, existing.seriesId ?? randomUUID())
          : {};

    const activity = await activityRepository.update(id, {
      type: input.type,
      status: input.status,
      priority: input.priority,
      subject: input.subject?.trim(),
      body: input.body?.trim(),
      contact: input.contactId === null ? { disconnect: true } : input.contactId ? { connect: { id: input.contactId } } : undefined,
      deal: input.dealId === null ? { disconnect: true } : input.dealId ? { connect: { id: input.dealId } } : undefined,
      company:
        input.companyId === null
          ? { disconnect: true }
          : input.companyId
            ? { connect: { id: input.companyId } }
            : undefined,
      lead: input.leadId === null ? { disconnect: true } : input.leadId ? { connect: { id: input.leadId } } : undefined,
      assignee:
        input.assigneeId === null
          ? { disconnect: true }
          : input.assigneeId
            ? { connect: { id: input.assigneeId } }
            : undefined,
      dueAt: input.dueAt,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      reminderAt: input.reminderAt,
      durationMinutes: input.durationMinutes,
      location: input.location?.trim(),
      ...recurrenceFields,
    });

    await recordHistory(auth, id, "UPDATED", input as Prisma.InputJsonValue);
    if (input.assigneeId !== undefined) {
      await recordHistory(auth, id, "ASSIGNED", { assigneeId: input.assigneeId });
    }
    if (input.reminderAt !== undefined) {
      await recordHistory(auth, id, "REMINDER_SET", { reminderAt: input.reminderAt });
    }
    if (input.recurrence !== undefined) {
      await recordHistory(auth, id, "RECURRENCE_UPDATED", (input.recurrence ?? {}) as Prisma.InputJsonValue);
    }

    return mapActivity(activity);
  },

  async completeActivity(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await activityRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Activity not found", "ACTIVITY_NOT_FOUND");
    if (!canManageActivityRecord(auth, existing.userId, existing.assigneeId)) {
      throw new AppError(403, "You do not have access to this activity", "FORBIDDEN");
    }

    const activity = await activityRepository.update(id, {
      status: "COMPLETED",
      completedAt: new Date(),
    });

    await recordHistory(auth, id, "COMPLETED");
    const next = await spawnNextRecurrence(existing, auth);

    return { activity: mapActivity(activity), nextOccurrence: next };
  },

  async reopenActivity(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await activityRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Activity not found", "ACTIVITY_NOT_FOUND");
    if (!canManageActivityRecord(auth, existing.userId, existing.assigneeId)) {
      throw new AppError(403, "You do not have access to this activity", "FORBIDDEN");
    }

    const activity = await activityRepository.update(id, {
      status: "PENDING",
      completedAt: null,
    });

    await recordHistory(auth, id, "REOPENED");
    return mapActivity(activity);
  },

  async cancelActivity(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await activityRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Activity not found", "ACTIVITY_NOT_FOUND");
    if (!canManageActivityRecord(auth, existing.userId, existing.assigneeId)) {
      throw new AppError(403, "You do not have access to this activity", "FORBIDDEN");
    }

    const activity = await activityRepository.update(id, {
      status: "CANCELLED",
    });

    await recordHistory(auth, id, "CANCELLED");
    return mapActivity(activity);
  },

  async deleteActivity(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await activityRepository.findById({ id, organizationId });

    if (!existing) throw new AppError(404, "Activity not found", "ACTIVITY_NOT_FOUND");
    if (!canManageActivityRecord(auth, existing.userId, existing.assigneeId)) {
      throw new AppError(403, "You do not have access to this activity", "FORBIDDEN");
    }

    await activityRepository.delete(id);
  },

  async exportActivities(query: ListActivitiesQuery, auth: AuthContext) {
    const where = buildActivityListWhere({ ...query, page: 1, pageSize: 10000 }, auth);
    const rows = await activityRepository.listForExport(where);

    return activitiesToCsv(
      rows.map((row) => ({
        type: row.type,
        status: row.status,
        priority: row.priority,
        subject: row.subject,
        body: row.body ?? undefined,
        dueAt: row.dueAt?.toISOString() ?? undefined,
        reminderAt: row.reminderAt?.toISOString() ?? undefined,
        location: row.location ?? undefined,
        contactEmail: row.contact?.email ?? undefined,
        dealTitle: row.deal?.title ?? undefined,
        companyName: row.company?.name ?? undefined,
      })),
    );
  },

  async importActivitiesCsv(input: ImportActivitiesCsvInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const rows = parseCsvActivities(input.csv);
    const created: ReturnType<typeof mapActivity>[] = [];
    const failed: Array<{ subject: string; reason: string }> = [];

    for (const row of rows) {
      if (!row.subject.trim()) {
        failed.push({ subject: row.subject || "(empty)", reason: "Subject is required" });
        continue;
      }

      try {
        let contactId: string | undefined;
        if (row.contactEmail) {
          const contact = await prisma.contact.findFirst({
            where: {
              organizationId,
              deletedAt: null,
              email: { equals: row.contactEmail, mode: "insensitive" },
            },
            select: { id: true, ownerId: true },
          });
          if (!contact) {
            failed.push({ subject: row.subject, reason: "Contact not found" });
            continue;
          }
          contactId = contact.id;
        }

        let dealId: string | undefined;
        if (row.dealTitle) {
          const deal = await prisma.deal.findFirst({
            where: {
              organizationId,
              deletedAt: null,
              title: { equals: row.dealTitle, mode: "insensitive" },
            },
            select: { id: true },
          });
          if (!deal) {
            failed.push({ subject: row.subject, reason: "Deal not found" });
            continue;
          }
          dealId = deal.id;
        }

        let companyId: string | undefined;
        if (row.companyName) {
          const company = await prisma.company.findFirst({
            where: {
              organizationId,
              deletedAt: null,
              name: { equals: row.companyName, mode: "insensitive" },
            },
            select: { id: true },
          });
          if (!company) {
            failed.push({ subject: row.subject, reason: "Company not found" });
            continue;
          }
          companyId = company.id;
        }

        if (!contactId && !dealId && !companyId) {
          failed.push({ subject: row.subject, reason: "Link to contact, deal, or company required" });
          continue;
        }

        const type = (row.type.toUpperCase() || "TASK") as ActivityType;
        const activity = await this.createActivity(
          {
            type,
            status: row.status.toUpperCase() as CreateActivityInput["status"],
            priority: row.priority.toUpperCase() as CreateActivityInput["priority"],
            subject: row.subject,
            body: row.body,
            contactId,
            dealId,
            companyId,
            dueAt: row.dueAt ? new Date(row.dueAt) : undefined,
            reminderAt: row.reminderAt ? new Date(row.reminderAt) : undefined,
            location: row.location,
          },
          auth,
        );
        created.push(activity);
      } catch (error) {
        failed.push({
          subject: row.subject,
          reason: error instanceof Error ? error.message : "Import failed",
        });
      }
    }

    return {
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
    };
  },
};
