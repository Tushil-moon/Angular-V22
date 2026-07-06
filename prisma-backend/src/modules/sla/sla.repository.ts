import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { queueSelect, slaPolicySelect } from "../../shared/utils/support-mapper";

export const slaRepository = {
  listPolicies(where: Prisma.SlaPolicyWhereInput, skip: number, take: number) {
    return prisma.slaPolicy.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: slaPolicySelect,
    });
  },

  countPolicies(where: Prisma.SlaPolicyWhereInput) {
    return prisma.slaPolicy.count({ where });
  },

  findPolicy(where: Prisma.SlaPolicyWhereInput) {
    return prisma.slaPolicy.findFirst({ where, select: slaPolicySelect });
  },

  createPolicy(data: Prisma.SlaPolicyCreateInput) {
    return prisma.slaPolicy.create({ data, select: slaPolicySelect });
  },

  updatePolicy(id: string, data: Prisma.SlaPolicyUpdateInput) {
    return prisma.slaPolicy.update({ where: { id }, data, select: slaPolicySelect });
  },

  deletePolicy(id: string) {
    return prisma.slaPolicy.delete({ where: { id } });
  },

  listQueues(where: Prisma.QueueWhereInput, skip: number, take: number) {
    return prisma.queue.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: queueSelect,
    });
  },

  countQueues(where: Prisma.QueueWhereInput) {
    return prisma.queue.count({ where });
  },

  findQueue(where: Prisma.QueueWhereInput) {
    return prisma.queue.findFirst({ where, select: queueSelect });
  },

  createQueue(data: Prisma.QueueCreateInput) {
    return prisma.queue.create({ data, select: queueSelect });
  },

  updateQueue(id: string, data: Prisma.QueueUpdateInput) {
    return prisma.queue.update({ where: { id }, data, select: queueSelect });
  },

  deleteQueue(id: string) {
    return prisma.queue.delete({ where: { id } });
  },

  clearDefaultQueue(organizationId: string, exceptId?: string) {
    return prisma.queue.updateMany({
      where: {
        organizationId,
        isDefault: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  },
};
