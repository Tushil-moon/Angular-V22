import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const activityTypeSchema = z.enum(["NOTE", "CALL", "EMAIL", "MEETING", "TASK"]);
export const activityStatusSchema = z.enum(["PENDING", "COMPLETED", "CANCELLED"]);
export const activityPrioritySchema = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export const recurrenceFrequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);

const recurrenceSchema = z
  .object({
    frequency: recurrenceFrequencySchema,
    interval: z.number().int().min(1).max(365).optional(),
    endAt: z.coerce.date().optional(),
  })
  .optional();

const linkRefine = (data: {
  contactId?: string;
  dealId?: string;
  companyId?: string;
  leadId?: string;
  type?: string;
}) => data.contactId || data.dealId || data.companyId || data.leadId || data.type === "TASK";

export const createActivitySchema = z
  .object({
    type: activityTypeSchema.optional(),
    status: activityStatusSchema.optional(),
    priority: activityPrioritySchema.optional(),
    subject: z.string().trim().min(1).max(200),
    body: z.string().max(5000).optional(),
    contactId: z.string().uuid().optional(),
    dealId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    assigneeId: z.string().uuid().optional(),
    dueAt: z.coerce.date().optional(),
    startedAt: z.coerce.date().optional(),
    completedAt: z.coerce.date().optional(),
    reminderAt: z.coerce.date().optional(),
    durationMinutes: z.number().int().min(1).max(1440).optional(),
    location: z.string().max(500).optional(),
    recurrence: recurrenceSchema,
  })
  .refine(linkRefine, {
    message: "Activity must be linked to a record or be a standalone task",
    path: ["contactId"],
  });

export const updateActivitySchema = z
  .object({
    type: activityTypeSchema.optional(),
    status: activityStatusSchema.optional(),
    priority: activityPrioritySchema.optional(),
    subject: z.string().trim().min(1).max(200).optional(),
    body: z.string().max(5000).optional(),
    contactId: z.string().uuid().nullable().optional(),
    dealId: z.string().uuid().nullable().optional(),
    companyId: z.string().uuid().nullable().optional(),
    leadId: z.string().uuid().nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueAt: z.coerce.date().nullable().optional(),
    startedAt: z.coerce.date().nullable().optional(),
    completedAt: z.coerce.date().nullable().optional(),
    reminderAt: z.coerce.date().nullable().optional(),
    durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
    location: z.string().max(500).nullable().optional(),
    recurrence: recurrenceSchema.nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const activityIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listActivitiesQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).optional(),
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  type: activityTypeSchema.optional(),
  status: activityStatusSchema.optional(),
  priority: activityPrioritySchema.optional(),
  assigneeId: z.string().uuid().optional(),
  overdue: z.coerce.boolean().optional(),
  dueSoonDays: z.coerce.number().int().min(1).max(90).optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  tasksOnly: z.coerce.boolean().optional(),
});

export const timelineQuerySchema = z.object({
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const importActivitiesCsvSchema = z.object({
  csv: z.string().min(1),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;
export type ImportActivitiesCsvInput = z.infer<typeof importActivitiesCsvSchema>;
