import type { Prisma } from "@prisma/client";

import { contactSelect, mapContact } from "../../shared/utils/crm-mapper";

export const leadSelect = {
  id: true,
  organizationId: true,
  contactId: true,
  stage: true,
  score: true,
  rating: true,
  nextFollowUpAt: true,
  qualifiedAt: true,
  convertedAt: true,
  lostAt: true,
  lostReason: true,
  qualificationNotes: true,
  lastScoredAt: true,
  createdAt: true,
  updatedAt: true,
  contact: { select: contactSelect },
} satisfies Prisma.LeadSelect;

type LeadRow = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

export const mapLead = (lead: LeadRow) => ({
  id: lead.id,
  organizationId: lead.organizationId,
  contactId: lead.contactId,
  stage: lead.stage,
  score: lead.score,
  rating: lead.rating,
  nextFollowUpAt: lead.nextFollowUpAt,
  qualifiedAt: lead.qualifiedAt,
  convertedAt: lead.convertedAt,
  lostAt: lead.lostAt,
  lostReason: lead.lostReason,
  qualificationNotes: lead.qualificationNotes,
  lastScoredAt: lead.lastScoredAt,
  contact: mapContact(lead.contact),
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
});

export { contactSelect };
