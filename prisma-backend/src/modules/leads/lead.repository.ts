import type { LeadHistoryAction, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { contactSelect, leadSelect } from "../../shared/utils/lead-mapper";

export type LeadRecord = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

export const leadRepository = {
  findMany(where: Prisma.LeadWhereInput, skip: number, take: number) {
    return prisma.lead.findMany({
      where,
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      skip,
      take,
      select: leadSelect,
    });
  },

  count(where: Prisma.LeadWhereInput) {
    return prisma.lead.count({ where });
  },

  findById(where: Prisma.LeadWhereInput) {
    return prisma.lead.findFirst({ where, select: leadSelect });
  },

  findByContactId(organizationId: string, contactId: string) {
    return prisma.lead.findFirst({
      where: { organizationId, contactId },
      select: leadSelect,
    });
  },

  create(data: Prisma.LeadCreateInput) {
    return prisma.lead.create({ data, select: leadSelect });
  },

  update(id: string, data: Prisma.LeadUpdateInput) {
    return prisma.lead.update({ where: { id }, data, select: leadSelect });
  },

  addHistory(data: {
    organizationId: string;
    leadId: string;
    userId?: string;
    action: LeadHistoryAction;
    details?: Prisma.InputJsonValue;
  }) {
    return prisma.leadHistory.create({ data });
  },

  listHistory(leadId: string) {
    return prisma.leadHistory.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  },

  listScoreRules(organizationId: string) {
    return prisma.leadScoreRule.findMany({
      where: { organizationId, active: true },
      select: { field: true, operator: true, value: true, points: true, active: true },
    });
  },

  listForExport(where: Prisma.LeadWhereInput) {
    return prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        stage: true,
        score: true,
        rating: true,
        nextFollowUpAt: true,
        contact: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            jobTitle: true,
            leadSource: true,
            notes: true,
          },
        },
      },
    });
  },

  findContactForScoring(contactId: string) {
    return prisma.contact.findFirst({
      where: { id: contactId, deletedAt: null },
      select: contactSelect,
    });
  },
};
