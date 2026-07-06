import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { workflowRunSelect, workflowSelect } from "../../shared/utils/automation-mapper";

export const workflowRepository = {
  findMany(where: Prisma.WorkflowWhereInput, skip: number, take: number) {
    return prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: workflowSelect,
    });
  },

  count(where: Prisma.WorkflowWhereInput) {
    return prisma.workflow.count({ where });
  },

  findById(where: Prisma.WorkflowWhereInput) {
    return prisma.workflow.findFirst({ where, select: workflowSelect });
  },

  findActiveByTrigger(organizationId: string, trigger: string) {
    return prisma.workflow.findMany({
      where: { organizationId, trigger, active: true },
      select: workflowSelect,
    });
  },

  create(data: Prisma.WorkflowCreateInput) {
    return prisma.workflow.create({ data, select: workflowSelect });
  },

  update(id: string, data: Prisma.WorkflowUpdateInput) {
    return prisma.workflow.update({ where: { id }, data, select: workflowSelect });
  },

  delete(id: string) {
    return prisma.workflow.delete({ where: { id } });
  },

  incrementRunCount(id: string) {
    return prisma.workflow.update({
      where: { id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    });
  },

  createRun(input: {
    organizationId: string;
    workflowId: string;
    triggerEvent: string;
    context: Prisma.InputJsonValue;
    steps: Array<{ stepOrder: number; actionType: string; input: Prisma.InputJsonValue }>;
  }) {
    return prisma.workflowRun.create({
      data: {
        organization: { connect: { id: input.organizationId } },
        workflow: { connect: { id: input.workflowId } },
        triggerEvent: input.triggerEvent,
        context: input.context,
        steps: {
          create: input.steps.map((step) => ({
            stepOrder: step.stepOrder,
            actionType: step.actionType,
            input: step.input,
          })),
        },
      },
      select: { id: true },
    });
  },

  findRunById(id: string) {
    return prisma.workflowRun.findUnique({ where: { id }, select: workflowRunSelect });
  },

  listRuns(workflowId: string, skip: number, take: number) {
    return prisma.workflowRun.findMany({
      where: { workflowId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: workflowRunSelect,
    });
  },

  countRuns(workflowId: string) {
    return prisma.workflowRun.count({ where: { workflowId } });
  },

  updateRun(id: string, data: Prisma.WorkflowRunUpdateInput) {
    return prisma.workflowRun.update({ where: { id }, data });
  },

  updateStepRun(id: string, data: Prisma.WorkflowStepRunUpdateInput) {
    return prisma.workflowStepRun.update({ where: { id }, data });
  },
};
