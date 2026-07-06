import type { ListWorkflowsQuery } from "./workflow.validation";

export const WORKFLOW_ACTION_TYPES = [
  "ASSIGN_OWNER",
  "CREATE_TASK",
  "CREATE_ACTIVITY",
  "NOTIFY",
] as const;

export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[number];

export const WORKFLOW_TRIGGERS = [
  "lead.created",
  "deal.created",
  "contact.created",
  "case.created",
] as const;

export type WorkflowStepDefinition = {
  order: number;
  type: WorkflowActionType;
  config: Record<string, unknown>;
};

export const parseWorkflowDefinition = (definition: unknown): WorkflowStepDefinition[] => {
  if (!definition || typeof definition !== "object") return [];
  const steps = (definition as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return [];

  return steps
    .map((step, index) => {
      if (!step || typeof step !== "object") return null;
      const row = step as { order?: number; type?: string; config?: Record<string, unknown> };
      if (!row.type || !WORKFLOW_ACTION_TYPES.includes(row.type as WorkflowActionType)) return null;
      return {
        order: row.order ?? index,
        type: row.type as WorkflowActionType,
        config: row.config ?? {},
      };
    })
    .filter((step): step is WorkflowStepDefinition => step !== null)
    .sort((a, b) => a.order - b.order);
};

export const buildWorkflowListWhere = (query: ListWorkflowsQuery, organizationId: string) => ({
  organizationId,
  ...(query.active !== undefined ? { active: query.active } : {}),
  ...(query.trigger ? { trigger: query.trigger } : {}),
  ...(query.search?.trim()
    ? {
        OR: [
          { name: { contains: query.search.trim(), mode: "insensitive" as const } },
          { description: { contains: query.search.trim(), mode: "insensitive" as const } },
        ],
      }
    : {}),
});

export const normalizeWorkflowDefinition = (definition: unknown) => ({
  steps: parseWorkflowDefinition(definition).map((step) => ({
    order: step.order,
    type: step.type,
    config: step.config,
  })),
});
