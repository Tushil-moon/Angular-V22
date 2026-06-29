import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateWorkflowInput, ListWorkflowsQuery, UpdateWorkflowInput } from "./workflow.validation";

export const workflowService = {
  async listWorkflows(query: ListWorkflowsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = {
      organizationId,
      ...(query.active !== undefined ? { active: query.active } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.workflow.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take: query.pageSize }),
      prisma.workflow.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getWorkflowById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.workflow.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");
    return item;
  },

  async createWorkflow(input: CreateWorkflowInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const { definition, ...rest } = input;
    return prisma.workflow.create({
      data: { ...rest, organizationId, definition: (definition ?? {}) as object },
    });
  },

  async updateWorkflow(id: string, input: UpdateWorkflowInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.workflow.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");
    const { definition, ...rest } = input;
    return prisma.workflow.update({
      where: { id },
      data: { ...rest, ...(definition !== undefined ? { definition: definition as object } : {}) },
    });
  },

  async deleteWorkflow(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.workflow.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Workflow not found", "WORKFLOW_NOT_FOUND");
    await prisma.workflow.delete({ where: { id } });
  },
};
