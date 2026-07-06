import type { Prisma } from "@prisma/client";

const userSelect = { id: true, email: true } as const;

export const workflowSelect = {
  id: true,
  organizationId: true,
  ownerId: true,
  name: true,
  description: true,
  trigger: true,
  active: true,
  definition: true,
  runCount: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: userSelect },
} satisfies Prisma.WorkflowSelect;

type WorkflowRow = Prisma.WorkflowGetPayload<{ select: typeof workflowSelect }>;

export const workflowStepRunSelect = {
  id: true,
  runId: true,
  stepOrder: true,
  actionType: true,
  status: true,
  input: true,
  output: true,
  errorMessage: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
} satisfies Prisma.WorkflowStepRunSelect;

export const workflowRunSelect = {
  id: true,
  organizationId: true,
  workflowId: true,
  triggerEvent: true,
  status: true,
  context: true,
  errorMessage: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  workflow: { select: { id: true, name: true, trigger: true } },
  steps: { orderBy: { stepOrder: "asc" }, select: workflowStepRunSelect },
} satisfies Prisma.WorkflowRunSelect;

type WorkflowRunRow = Prisma.WorkflowRunGetPayload<{ select: typeof workflowRunSelect }>;

export const webhookSelect = {
  id: true,
  organizationId: true,
  url: true,
  events: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WebhookSelect;

export const webhookDeliverySelect = {
  id: true,
  webhookId: true,
  event: true,
  payload: true,
  status: true,
  attempts: true,
  responseStatus: true,
  errorMessage: true,
  lastAttemptAt: true,
  completedAt: true,
  createdAt: true,
} satisfies Prisma.WebhookDeliverySelect;

const mapUser = (user: { id: string; email: string | null } | null) =>
  user ? { id: user.id, email: user.email } : null;

export const mapWorkflow = (workflow: WorkflowRow) => ({
  id: workflow.id,
  organizationId: workflow.organizationId,
  ownerId: workflow.ownerId,
  name: workflow.name,
  description: workflow.description,
  trigger: workflow.trigger,
  active: workflow.active,
  definition: workflow.definition,
  runCount: workflow.runCount,
  lastRunAt: workflow.lastRunAt,
  owner: mapUser(workflow.owner),
  createdAt: workflow.createdAt,
  updatedAt: workflow.updatedAt,
});

export const mapWorkflowStepRun = (
  step: Prisma.WorkflowStepRunGetPayload<{ select: typeof workflowStepRunSelect }>,
) => ({
  id: step.id,
  runId: step.runId,
  stepOrder: step.stepOrder,
  actionType: step.actionType,
  status: step.status,
  input: step.input,
  output: step.output,
  errorMessage: step.errorMessage,
  startedAt: step.startedAt,
  completedAt: step.completedAt,
  createdAt: step.createdAt,
});

export const mapWorkflowRun = (run: WorkflowRunRow) => ({
  id: run.id,
  organizationId: run.organizationId,
  workflowId: run.workflowId,
  triggerEvent: run.triggerEvent,
  status: run.status,
  context: run.context,
  errorMessage: run.errorMessage,
  startedAt: run.startedAt,
  completedAt: run.completedAt,
  workflow: run.workflow,
  steps: run.steps.map(mapWorkflowStepRun),
  createdAt: run.createdAt,
});

export const mapWebhook = (
  webhook: Prisma.WebhookGetPayload<{ select: typeof webhookSelect }>,
) => ({
  id: webhook.id,
  organizationId: webhook.organizationId,
  url: webhook.url,
  events: webhook.events,
  active: webhook.active,
  createdAt: webhook.createdAt,
  updatedAt: webhook.updatedAt,
});

export const mapWebhookDelivery = (
  delivery: Prisma.WebhookDeliveryGetPayload<{ select: typeof webhookDeliverySelect }>,
) => ({
  id: delivery.id,
  webhookId: delivery.webhookId,
  event: delivery.event,
  payload: delivery.payload,
  status: delivery.status,
  attempts: delivery.attempts,
  responseStatus: delivery.responseStatus,
  errorMessage: delivery.errorMessage,
  lastAttemptAt: delivery.lastAttemptAt,
  completedAt: delivery.completedAt,
  createdAt: delivery.createdAt,
});
