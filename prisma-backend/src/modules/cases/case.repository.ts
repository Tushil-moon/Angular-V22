import type { CaseHistoryAction, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { caseSelect } from "../../shared/utils/support-mapper";

export const caseRepository = {
  findMany(where: Prisma.CaseWhereInput, skip: number, take: number) {
    return prisma.case.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: caseSelect,
    });
  },

  count(where: Prisma.CaseWhereInput) {
    return prisma.case.count({ where });
  },

  findById(where: Prisma.CaseWhereInput) {
    return prisma.case.findFirst({ where, select: caseSelect });
  },

  countForNumber(organizationId: string) {
    return prisma.case.count({ where: { organizationId } });
  },

  create(data: Prisma.CaseCreateInput) {
    return prisma.case.create({ data, select: caseSelect });
  },

  update(id: string, data: Prisma.CaseUpdateInput) {
    return prisma.case.update({ where: { id }, data, select: caseSelect });
  },

  delete(id: string) {
    return prisma.case.delete({ where: { id } });
  },

  addComment(data: Prisma.CaseCommentCreateInput) {
    return prisma.caseComment.create({
      data,
      select: {
        id: true,
        caseId: true,
        userId: true,
        body: true,
        isInternal: true,
        createdAt: true,
        user: { select: { id: true, email: true } },
      },
    });
  },

  addHistory(data: {
    organizationId: string;
    caseId: string;
    userId?: string;
    action: CaseHistoryAction;
    details?: Prisma.InputJsonValue;
  }) {
    return prisma.caseHistory.create({ data });
  },

  listHistory(caseId: string) {
    return prisma.caseHistory.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, email: true } } },
    });
  },

  listSlaPolicies(organizationId: string) {
    return prisma.slaPolicy.findMany({ where: { organizationId, active: true } });
  },

  findQueue(id: string, organizationId: string) {
    return prisma.queue.findFirst({
      where: { id, organizationId },
      include: { slaPolicy: true },
    });
  },

  findDefaultQueue(organizationId: string) {
    return prisma.queue.findFirst({
      where: { organizationId, isDefault: true },
      include: { slaPolicy: true },
    });
  },
};
