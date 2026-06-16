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
  })
  .refine((data) => data.contactId || data.dealId, {
    message: "Activity must be linked to a contact or deal",
    path: ["contactId"],
  });

export const listActivitiesQuerySchema = paginationQuerySchema.extend({
  contactId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
