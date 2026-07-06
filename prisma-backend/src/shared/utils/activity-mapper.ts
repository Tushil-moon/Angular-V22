import type { Prisma } from "@prisma/client";

import { mapOwner } from "./crm-mapper";

export const activitySelect = {
  id: true,
  organizationId: true,
  type: true,
  status: true,
  priority: true,
  subject: true,
  body: true,
  contactId: true,
  dealId: true,
  companyId: true,
  leadId: true,
  userId: true,
  assigneeId: true,
  dueAt: true,
  startedAt: true,
  completedAt: true,
  reminderAt: true,
  durationMinutes: true,
  location: true,
  seriesId: true,
  recurrenceFrequency: true,
  recurrenceInterval: true,
  recurrenceEndAt: true,
  isRecurrenceTemplate: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true } },
  assignee: { select: { id: true, email: true } },
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  deal: {
    select: {
      id: true,
      title: true,
    },
  },
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  lead: {
    select: {
      id: true,
      contact: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} satisfies Prisma.ActivitySelect;

type ActivityRow = Prisma.ActivityGetPayload<{ select: typeof activitySelect }>;

export const mapActivity = (activity: ActivityRow) => ({
  id: activity.id,
  organizationId: activity.organizationId,
  type: activity.type,
  status: activity.status,
  priority: activity.priority,
  subject: activity.subject,
  body: activity.body,
  contactId: activity.contactId,
  dealId: activity.dealId,
  companyId: activity.companyId,
  leadId: activity.leadId,
  userId: activity.userId,
  assigneeId: activity.assigneeId,
  dueAt: activity.dueAt,
  startedAt: activity.startedAt,
  completedAt: activity.completedAt,
  reminderAt: activity.reminderAt,
  durationMinutes: activity.durationMinutes,
  location: activity.location,
  seriesId: activity.seriesId,
  recurrenceFrequency: activity.recurrenceFrequency,
  recurrenceInterval: activity.recurrenceInterval,
  recurrenceEndAt: activity.recurrenceEndAt,
  isRecurrenceTemplate: activity.isRecurrenceTemplate,
  user: mapOwner(activity.user),
  assignee: mapOwner(activity.assignee),
  contact: activity.contact
    ? {
        id: activity.contact.id,
        fullName: `${activity.contact.firstName} ${activity.contact.lastName}`.trim(),
      }
    : null,
  deal: activity.deal,
  company: activity.company,
  lead: activity.lead
    ? {
        id: activity.lead.id,
        fullName: `${activity.lead.contact.firstName} ${activity.lead.contact.lastName}`.trim(),
      }
    : null,
  createdAt: activity.createdAt,
  updatedAt: activity.updatedAt,
});
