import type { Prisma } from "@prisma/client";

import { enqueueJob } from "../jobs/job-queue";
import { dispatchWebhookDelivery } from "../../modules/webhooks/webhook.dispatcher";
import { executeWorkflowRun } from "../../modules/workflows/workflow.engine";
import { parseWorkflowDefinition } from "../../modules/workflows/workflow.utils";
import { webhookRepository } from "../../modules/webhooks/webhook.repository";
import { workflowRepository } from "../../modules/workflows/workflow.repository";

export const DOMAIN_EVENTS = [
  "lead.created",
  "deal.created",
  "contact.created",
  "case.created",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENTS)[number];

export type DomainEventPayload = Record<string, unknown>;

export const emitDomainEvent = async (
  organizationId: string,
  event: DomainEventType,
  payload: DomainEventPayload,
) => {
  const [workflows, webhooks] = await Promise.all([
    workflowRepository.findActiveByTrigger(organizationId, event),
    webhookRepository.findActiveByEvent(organizationId, event),
  ]);

  for (const workflow of workflows) {
    const run = await workflowRepository.createRun({
      organizationId,
      workflowId: workflow.id,
      triggerEvent: event,
      context: payload as Prisma.InputJsonValue,
      steps: parseWorkflowDefinition(workflow.definition).map((step) => ({
        stepOrder: step.order,
        actionType: step.type,
        input: step.config as Prisma.InputJsonValue,
      })),
    });

    await workflowRepository.incrementRunCount(workflow.id);

    enqueueJob(`workflow-run:${run.id}`, () => executeWorkflowRun(run.id));
  }

  for (const webhook of webhooks) {
    const delivery = await webhookRepository.createDelivery({
      webhook: { connect: { id: webhook.id } },
      event,
      payload: {
        event,
        organizationId,
        data: payload,
        timestamp: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    });

    enqueueJob(`webhook-delivery:${delivery.id}`, () => dispatchWebhookDelivery(delivery.id));
  }
};
