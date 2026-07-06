import type { CaseHistoryAction, CaseStatus, Prisma } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error";
import { mapCase, mapCaseHistoryEntry } from "../../shared/utils/support-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { caseRepository } from "./case.repository";
import {
  assertCaseTransition,
  buildCaseListWhere,
  evaluateSlaBreaches,
  findMatchingSlaPolicy,
  generateCaseNumber,
  resolveSlaDueDates,
} from "./case.utils";
import type {
  AddCaseCommentInput,
  AssignCaseInput,
  CreateCaseInput,
  ListCasesQuery,
  UpdateCaseInput,
} from "./case.validation";

const recordHistory = async (
  auth: AuthContext,
  caseId: string,
  action: CaseHistoryAction,
  details?: Prisma.InputJsonValue,
) => {
  const organizationId = requireOrganizationContext(auth);
  await caseRepository.addHistory({
    organizationId,
    caseId,
    userId: auth.userId,
    action,
    details: details ?? {},
  });
};

const resolveSlaForCase = async (
  organizationId: string,
  input: { priority?: string; queueId?: string; slaPolicyId?: string },
) => {
  if (input.slaPolicyId) {
    const policies = await caseRepository.listSlaPolicies(organizationId);
    const policy = policies.find((item) => item.id === input.slaPolicyId);
    if (!policy) throw new AppError(400, "SLA policy not found", "SLA_POLICY_NOT_FOUND");
    return policy;
  }

  if (input.queueId) {
    const queue = await caseRepository.findQueue(input.queueId, organizationId);
    if (!queue) throw new AppError(400, "Queue not found", "QUEUE_NOT_FOUND");
    if (queue.slaPolicy) return queue.slaPolicy;
  }

  const defaultQueue = await caseRepository.findDefaultQueue(organizationId);
  if (defaultQueue?.slaPolicy) return defaultQueue.slaPolicy;

  const policies = await caseRepository.listSlaPolicies(organizationId);
  return findMatchingSlaPolicy(policies, (input.priority as never) ?? "MEDIUM");
};

const applySlaState = async (auth: AuthContext, caseId: string) => {
  const organizationId = requireOrganizationContext(auth);
  const item = await caseRepository.findById({ id: caseId, organizationId });
  if (!item) return null;

  const breached = evaluateSlaBreaches(item);
  if (breached && !item.slaBreached) {
    await caseRepository.update(caseId, { slaBreached: true });
    await recordHistory(auth, caseId, "SLA_BREACH");
  }

  return caseRepository.findById({ id: caseId, organizationId });
};

export const caseService = {
  async listCases(query: ListCasesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildCaseListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      caseRepository.findMany(where, skip, query.pageSize),
      caseRepository.count(where),
    ]);

    return { data: data.map(mapCase), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getCaseById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const refreshed = await applySlaState(auth, id);
    const item = refreshed ?? (await caseRepository.findById({ id, organizationId }));
    if (!item) throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
    return mapCase(item);
  },

  async createCase(input: CreateCaseInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const priority = input.priority ?? "MEDIUM";
    const policy = await resolveSlaForCase(organizationId, input);
    const slaDates = policy ? resolveSlaDueDates(policy) : null;
    const sequence = (await caseRepository.countForNumber(organizationId)) + 1;

    const item = await caseRepository.create({
      organization: { connect: { id: organizationId } },
      caseNumber: generateCaseNumber(sequence),
      subject: input.subject,
      description: input.description,
      status: input.status ?? "OPEN",
      priority,
      contact: input.contactId ? { connect: { id: input.contactId } } : undefined,
      company: input.companyId ? { connect: { id: input.companyId } } : undefined,
      assignee: input.assigneeId ? { connect: { id: input.assigneeId } } : undefined,
      queue: input.queueId ? { connect: { id: input.queueId } } : undefined,
      slaPolicy: policy ? { connect: { id: policy.id } } : undefined,
      firstResponseDueAt: slaDates?.firstResponseDueAt,
      resolutionDueAt: slaDates?.resolutionDueAt,
    });

    await recordHistory(auth, item.id, "CREATED");
    return mapCase(item);
  },

  async updateCase(id: string, input: UpdateCaseInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await caseRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Case not found", "CASE_NOT_FOUND");

    if (input.status && input.status !== existing.status) {
      try {
        assertCaseTransition(existing.status, input.status);
      } catch {
        throw new AppError(409, "Invalid case status transition", "CASE_INVALID_TRANSITION");
      }
    }

    const priority = input.priority ?? existing.priority;
    let slaPolicyConnect: Prisma.CaseUpdateInput["slaPolicy"] | undefined;
    let slaDates: ReturnType<typeof resolveSlaDueDates> | null = null;

    if (input.slaPolicyId !== undefined || input.queueId !== undefined || input.priority) {
      const policy = await resolveSlaForCase(organizationId, {
        priority,
        queueId: input.queueId ?? existing.queueId ?? undefined,
        slaPolicyId: input.slaPolicyId ?? existing.slaPolicyId ?? undefined,
      });
      slaPolicyConnect = policy ? { connect: { id: policy.id } } : { disconnect: true };
      slaDates = policy ? resolveSlaDueDates(policy, existing.createdAt) : null;
    }

    await caseRepository.update(id, {
      subject: input.subject,
      description: input.description === null ? null : input.description,
      status: input.status,
      priority: input.priority,
      firstResponseDueAt: slaDates?.firstResponseDueAt,
      resolutionDueAt: slaDates?.resolutionDueAt,
      slaPolicy: slaPolicyConnect,
      resolvedAt:
        input.status === "RESOLVED" && existing.status !== "RESOLVED" ? new Date() : undefined,
      closedAt: input.status === "CLOSED" && existing.status !== "CLOSED" ? new Date() : undefined,
      contact:
        input.contactId === null
          ? { disconnect: true }
          : input.contactId
            ? { connect: { id: input.contactId } }
            : undefined,
      company:
        input.companyId === null
          ? { disconnect: true }
          : input.companyId
            ? { connect: { id: input.companyId } }
            : undefined,
      assignee:
        input.assigneeId === null
          ? { disconnect: true }
          : input.assigneeId
            ? { connect: { id: input.assigneeId } }
            : undefined,
      queue:
        input.queueId === null
          ? { disconnect: true }
          : input.queueId
            ? { connect: { id: input.queueId } }
            : undefined,
    });

    if (input.status && input.status !== existing.status) {
      await recordHistory(auth, id, "STATUS_CHANGED", {
        from: existing.status,
        to: input.status,
      });
    } else {
      await recordHistory(auth, id, "UPDATED");
    }

    const refreshed = await applySlaState(auth, id);
    return mapCase(refreshed!);
  },

  async deleteCase(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await caseRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
    await caseRepository.delete(id);
  },

  async addComment(id: string, input: AddCaseCommentInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await caseRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
    if (!auth.userId) throw new AppError(401, "Authentication required", "UNAUTHORIZED");

    await caseRepository.addComment({
      case: { connect: { id } },
      user: { connect: { id: auth.userId } },
      body: input.body,
      isInternal: input.isInternal ?? false,
    });

    const updates: Prisma.CaseUpdateInput = {};
    if (!existing.firstRespondedAt && !input.isInternal) {
      updates.firstRespondedAt = new Date();
    }

    if (Object.keys(updates).length) {
      await caseRepository.update(id, updates);
    }

    await recordHistory(auth, id, "COMMENT_ADDED", { internal: input.isInternal ?? false });
    const refreshed = await applySlaState(auth, id);
    return mapCase(refreshed!);
  },

  async assignCase(id: string, input: AssignCaseInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await caseRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Case not found", "CASE_NOT_FOUND");

    await caseRepository.update(id, {
      assignee: input.assigneeId ? { connect: { id: input.assigneeId } } : { disconnect: true },
      status: existing.status === "OPEN" ? "IN_PROGRESS" : undefined,
    });

    await recordHistory(auth, id, "ASSIGNED", { assigneeId: input.assigneeId });
    const refreshed = await caseRepository.findById({ id, organizationId });
    return mapCase(refreshed!);
  },

  async resolveCase(id: string, auth: AuthContext) {
    return this.updateCase(id, { status: "RESOLVED" as CaseStatus }, auth);
  },

  async closeCase(id: string, auth: AuthContext) {
    return this.updateCase(id, { status: "CLOSED" as CaseStatus }, auth);
  },

  async reopenCase(id: string, auth: AuthContext) {
    return this.updateCase(id, { status: "OPEN" as CaseStatus }, auth);
  },

  async listHistory(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await caseRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
    const history = await caseRepository.listHistory(id);
    return history.map(mapCaseHistoryEntry);
  },
};
