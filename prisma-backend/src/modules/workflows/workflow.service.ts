import type { Prisma } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error";
import { mapWorkflow, mapWorkflowRun } from "../../shared/utils/automation-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { enqueueJob } from "../../shared/jobs/job-queue";
import { executeWorkflowRun } from "./workflow.engine";
import { workflowRepository } from "./workflow.repository";
import { buildWorkflowListWhere, normalizeWorkflowDefinition, parseWorkflowDefinition } from "./workflow.utils";
import type {
  CreateWorkflowInput,
  ListWorkflowsQuery,
  TestWorkflowInput,
  UpdateWorkflowInput,
} from "./workflow.validation";

export const workflowService = {
  async listWorkflows(query: ListWorkflowsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildWorkflowListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      workflowRepository.findMany(where, skip, query.pageSize),
      workflowRepository.count(where),
    ]);
    return { data: data.map(mapWorkflow), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getWorkflowById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await workflowRepository.findById({ id, organizationId });
    if (!item) throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");
    return mapWorkflow(item);
  },

  async createWorkflow(input: CreateWorkflowInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await workflowRepository.create({
      organization: { connect: { id: organizationId } },
      name: input.name,
      description: input.description,
      trigger: input.trigger,
      active: input.active ?? true,
      definition: normalizeWorkflowDefinition(input.definition ?? {}) as Prisma.InputJsonValue,
      owner: input.ownerId
        ? { connect: { id: input.ownerId } }
        : auth.userId
          ? { connect: { id: auth.userId } }
          : undefined,
    });
    return mapWorkflow(item);
  },

  async updateWorkflow(id: string, input: UpdateWorkflowInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await workflowRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");

    const item = await workflowRepository.update(id, {
      name: input.name,
      description: input.description === null ? null : input.description,
      trigger: input.trigger,
      active: input.active,
      definition: input.definition
        ? (normalizeWorkflowDefinition(input.definition) as Prisma.InputJsonValue)
        : undefined,
      owner:
        input.ownerId === null
          ? { disconnect: true }
          : input.ownerId
            ? { connect: { id: input.ownerId } }
            : undefined,
    });
    return mapWorkflow(item);
  },

  async deleteWorkflow(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await workflowRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");
    await workflowRepository.delete(id);
  },

  async activateWorkflow(id: string, auth: AuthContext) {
    return this.updateWorkflow(id, { active: true }, auth);
  },

  async deactivateWorkflow(id: string, auth: AuthContext) {
    return this.updateWorkflow(id, { active: false }, auth);
  },

  async listRuns(id: string, query: ListWorkflowsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await workflowRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");

    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      workflowRepository.listRuns(id, skip, query.pageSize),
      workflowRepository.countRuns(id),
    ]);
    return { data: data.map(mapWorkflowRun), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async testWorkflow(id: string, input: TestWorkflowInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const workflow = await workflowRepository.findById({ id, organizationId });
    if (!workflow) throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");

    const context = {
      userId: auth.userId,
      ...input.context,
    };

    const steps = parseWorkflowDefinition(workflow.definition);
    const run = await workflowRepository.createRun({
      organizationId,
      workflowId: workflow.id,
      triggerEvent: `${workflow.trigger}:test`,
      context,
      steps: steps.map((step) => ({
        stepOrder: step.order,
        actionType: step.type,
        input: step.config as Prisma.InputJsonValue,
      })),
    });

    await workflowRepository.incrementRunCount(workflow.id);
    enqueueJob(`workflow-test:${run.id}`, () => executeWorkflowRun(run.id));

    const refreshed = await workflowRepository.findRunById(run.id);
    return mapWorkflowRun(refreshed!);
  },
};
