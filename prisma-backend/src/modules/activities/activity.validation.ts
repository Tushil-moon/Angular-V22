import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const activityTypeSchema = z.enum(["NOTE", "CALL", "EMAIL", "MEETING", "TASK"]);

export const createActivitySchema = z
  .object({
    type: activityTypeSchema.optional(),
    subject: z.string().trim().min(1).max(200),
    body: z.string().max(5000).optional(),
    contactId: z.string().uuid().optional(),
    dealId: z.string().uuid().optional(),
    dueAt: z.coerce.date().optional(),
    completedAt: z.coerce.date().optional(),
  })
  .refine((data) => data.contactId || data.dealId, {
    message: "Activity must be linked to a contact or deal",
    path: ["contactId"],
  });

export const updateActivitySchema = z
  .object({
    type: activityTypeSchema.optional(),
    subject: z.string().trim().min(1).max(200).optional(),
    body: z.string().max(5000).optional(),
    contactId: z.string().uuid().optional(),
    dealId: z.string().uuid().optional(),
    dueAt: z.coerce.date().nullable().optional(),
    completedAt: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const activityIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listActivitiesQuerySchema = paginationQuerySchema.extend({
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
