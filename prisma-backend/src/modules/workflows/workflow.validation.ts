import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";
import { WORKFLOW_ACTION_TYPES, WORKFLOW_TRIGGERS } from "./workflow.utils";

export const workflowStepSchema = z.object({
  order: z.coerce.number().int().min(0),
  type: z.enum(WORKFLOW_ACTION_TYPES),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const workflowDefinitionSchema = z.object({
  steps: z.array(workflowStepSchema).optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  trigger: z.enum(WORKFLOW_TRIGGERS),
  active: z.boolean().optional(),
  definition: workflowDefinitionSchema.optional(),
  ownerId: z.string().uuid().optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  trigger: z.enum(WORKFLOW_TRIGGERS).optional(),
  active: z.boolean().optional(),
  definition: workflowDefinitionSchema.optional(),
  ownerId: z.string().uuid().nullable().optional(),
});

export const workflowIdParamSchema = z.object({ id: z.string().uuid() });

export const listWorkflowsQuerySchema = paginationQuerySchema.extend({
  active: z.coerce.boolean().optional(),
  trigger: z.enum(WORKFLOW_TRIGGERS).optional(),
  search: z.string().optional(),
});

export const testWorkflowSchema = z.object({
  context: z.record(z.string(), z.unknown()).optional(),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type ListWorkflowsQuery = z.infer<typeof listWorkflowsQuerySchema>;
export type TestWorkflowInput = z.infer<typeof testWorkflowSchema>;
