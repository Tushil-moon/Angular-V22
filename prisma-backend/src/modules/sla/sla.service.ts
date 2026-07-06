import type { Prisma } from "@prisma/client";

import { AppError } from "../../shared/errors/app-error";
import { mapQueue, mapSlaPolicy } from "../../shared/utils/support-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { slaRepository } from "./sla.repository";
import type {
  CreateQueueInput,
  CreateSlaPolicyInput,
  ListQueuesQuery,
  ListSlaPoliciesQuery,
  UpdateQueueInput,
  UpdateSlaPolicyInput,
} from "./sla.validation";

const buildPolicyWhere = (query: ListSlaPoliciesQuery, organizationId: string): Prisma.SlaPolicyWhereInput => {
  const filters: Prisma.SlaPolicyWhereInput = { organizationId };
  if (query.active !== undefined) filters.active = query.active;
  const search = query.search?.trim();
  if (search) {
    filters.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  return filters;
};

const buildQueueWhere = (query: ListQueuesQuery, organizationId: string): Prisma.QueueWhereInput => {
  const filters: Prisma.QueueWhereInput = { organizationId };
  const search = query.search?.trim();
  if (search) {
    filters.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  return filters;
};

export const slaService = {
  async listPolicies(query: ListSlaPoliciesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildPolicyWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      slaRepository.listPolicies(where, skip, query.pageSize),
      slaRepository.countPolicies(where),
    ]);
    return { data: data.map(mapSlaPolicy), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getPolicyById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await slaRepository.findPolicy({ id, organizationId });
    if (!item) throw new AppError(404, "SLA policy not found", "SLA_POLICY_NOT_FOUND");
    return mapSlaPolicy(item);
  },

  async createPolicy(input: CreateSlaPolicyInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await slaRepository.createPolicy({
      organization: { connect: { id: organizationId } },
      name: input.name,
      description: input.description,
      priority: input.priority ?? "MEDIUM",
      firstResponseHours: input.firstResponseHours,
      resolutionHours: input.resolutionHours,
      active: input.active ?? true,
    });
    return mapSlaPolicy(item);
  },

  async updatePolicy(id: string, input: UpdateSlaPolicyInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await slaRepository.findPolicy({ id, organizationId });
    if (!existing) throw new AppError(404, "SLA policy not found", "SLA_POLICY_NOT_FOUND");
    const item = await slaRepository.updatePolicy(id, input);
    return mapSlaPolicy(item);
  },

  async deletePolicy(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await slaRepository.findPolicy({ id, organizationId });
    if (!existing) throw new AppError(404, "SLA policy not found", "SLA_POLICY_NOT_FOUND");
    await slaRepository.deletePolicy(id);
  },

  async listQueues(query: ListQueuesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildQueueWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      slaRepository.listQueues(where, skip, query.pageSize),
      slaRepository.countQueues(where),
    ]);
    return { data: data.map(mapQueue), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getQueueById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await slaRepository.findQueue({ id, organizationId });
    if (!item) throw new AppError(404, "Queue not found", "QUEUE_NOT_FOUND");
    return mapQueue(item);
  },

  async createQueue(input: CreateQueueInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    if (input.isDefault) await slaRepository.clearDefaultQueue(organizationId);

    const item = await slaRepository.createQueue({
      organization: { connect: { id: organizationId } },
      name: input.name,
      description: input.description,
      isDefault: input.isDefault ?? false,
      slaPolicy: input.slaPolicyId ? { connect: { id: input.slaPolicyId } } : undefined,
    });
    return mapQueue(item);
  },

  async updateQueue(id: string, input: UpdateQueueInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await slaRepository.findQueue({ id, organizationId });
    if (!existing) throw new AppError(404, "Queue not found", "QUEUE_NOT_FOUND");
    if (input.isDefault) await slaRepository.clearDefaultQueue(organizationId, id);

    const item = await slaRepository.updateQueue(id, {
      name: input.name,
      description: input.description,
      isDefault: input.isDefault,
      slaPolicy:
        input.slaPolicyId === null
          ? { disconnect: true }
          : input.slaPolicyId
            ? { connect: { id: input.slaPolicyId } }
            : undefined,
    });
    return mapQueue(item);
  },

  async deleteQueue(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await slaRepository.findQueue({ id, organizationId });
    if (!existing) throw new AppError(404, "Queue not found", "QUEUE_NOT_FOUND");
    await slaRepository.deleteQueue(id);
  },
};
