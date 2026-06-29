import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  trigger: z.string().trim().min(1).max(100),
  active: z.boolean().optional(),
  definition: z.record(z.string(), z.unknown()).optional(),
});

export const updateWorkflowSchema = createWorkflowSchema.partial();

export const workflowIdParamSchema = z.object({ id: z.string().uuid() });

export const listWorkflowsQuerySchema = paginationQuerySchema.extend({
  active: z.coerce.boolean().optional(),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type ListWorkflowsQuery = z.infer<typeof listWorkflowsQuerySchema>;
