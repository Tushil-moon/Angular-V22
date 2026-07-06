import { prisma } from "../../config/prisma";
import { logger } from "../../config/logger";
import { workflowRepository } from "./workflow.repository";
import type { WorkflowActionType } from "./workflow.utils";

const str = (value: unknown) => (value == null ? undefined : String(value));

export const executeWorkflowRun = async (runId: string) => {
  const run = await workflowRepository.findRunById(runId);
  if (!run) return;

  await workflowRepository.updateRun(runId, {
    status: "RUNNING",
    startedAt: new Date(),
  });

  let failed = false;

  for (const step of run.steps) {
    if (failed) {
      await workflowRepository.updateStepRun(step.id, {
        status: "SKIPPED",
        completedAt: new Date(),
      });
      continue;
    }

    await workflowRepository.updateStepRun(step.id, {
      status: "RUNNING",
      startedAt: new Date(),
    });

    try {
      const output = await executeStep(
        step.actionType as WorkflowActionType,
        (step.input ?? {}) as Record<string, unknown>,
        (run.context ?? {}) as Record<string, unknown>,
        run.organizationId,
      );

      await workflowRepository.updateStepRun(step.id, {
        status: "COMPLETED",
        output: output ?? {},
        completedAt: new Date(),
      });
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : "Step failed";
      await workflowRepository.updateStepRun(step.id, {
        status: "FAILED",
        errorMessage: message,
        completedAt: new Date(),
      });
      await workflowRepository.updateRun(runId, {
        status: "FAILED",
        errorMessage: message,
        completedAt: new Date(),
      });
    }
  }

  if (!failed) {
    await workflowRepository.updateRun(runId, {
      status: "COMPLETED",
      completedAt: new Date(),
    });
  }
};

const executeStep = async (
  actionType: WorkflowActionType,
  config: Record<string, unknown>,
  context: Record<string, unknown>,
  organizationId: string,
) => {
  switch (actionType) {
    case "ASSIGN_OWNER":
      return assignOwner(config, context, organizationId);
    case "CREATE_TASK":
    case "CREATE_ACTIVITY":
      return createActivity(config, context, organizationId);
    case "NOTIFY":
      logger.info({ organizationId, context, config }, "Workflow notify step");
      return { notified: true };
    default:
      throw new Error(`Unsupported action type: ${actionType}`);
  }
};

const assignOwner = async (
  config: Record<string, unknown>,
  context: Record<string, unknown>,
  organizationId: string,
) => {
  const contactId = str(context.contactId);
  const ownerId = str(config.ownerId) ?? str(context.userId);
  if (!contactId || !ownerId) throw new Error("ASSIGN_OWNER requires contactId and ownerId");

  await prisma.contact.updateMany({
    where: { id: contactId, organizationId },
    data: { ownerId },
  });

  return { contactId, ownerId };
};

const createActivity = async (
  config: Record<string, unknown>,
  context: Record<string, unknown>,
  organizationId: string,
) => {
  const title = str(config.title) ?? str(config.subject) ?? "Workflow task";
  const contactId = str(context.contactId);
  const assigneeId = str(config.assigneeId) ?? str(config.ownerId) ?? str(context.userId);
  const userId = str(context.userId);
  if (!userId) throw new Error("CREATE_TASK requires userId in context");
  const dueInDays = Number(config.dueInDays ?? 1);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueInDays);

  const activity = await prisma.activity.create({
    data: {
      organizationId,
      type: "TASK",
      subject: title,
      body: str(config.description),
      status: "PENDING",
      priority: "NORMAL",
      dueAt: dueDate,
      contactId,
      assigneeId,
      userId,
    },
  });

  return { activityId: activity.id };
};
