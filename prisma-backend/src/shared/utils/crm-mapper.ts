import type { DealStage, Prisma } from "@prisma/client";

import { computeWeightedValue, resolveDealProbability } from "../../modules/deals/deal.utils";

export const ownerSelect = {
  id: true,
  email: true,
} satisfies Prisma.UserSelect;

export const tagRelationSelect = {
  tag: { select: { id: true, name: true, color: true } },
};

export const companySelect = {
  id: true,
  name: true,
  domain: true,
  industry: true,
  size: true,
  website: true,
  address: true,
  parentCompanyId: true,
  employeeCount: true,
  annualRevenue: true,
  revenueCurrency: true,
  ownershipPercent: true,
  ownerId: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: ownerSelect },
  parentCompany: { select: { id: true, name: true, domain: true } },
  locations: {
    select: {
      id: true,
      label: true,
      line1: true,
      line2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      isPrimary: true,
      isHeadquarters: true,
    },
    orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
  },
  _count: { select: { contacts: true, subsidiaries: true } },
} satisfies Prisma.CompanySelect;

export const contactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  company: true,
  companyId: true,
  jobTitle: true,
  status: true,
  leadSource: true,
  sourceDetail: true,
  notes: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: ownerSelect },
  companyRef: { select: { id: true, name: true, domain: true } },
  tags: { select: tagRelationSelect },
  emails: {
    select: { id: true, email: true, type: true, isPrimary: true },
    orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
  },
  phones: {
    select: { id: true, phone: true, type: true, isPrimary: true },
    orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
  },
  addresses: {
    select: {
      id: true,
      label: true,
      line1: true,
      line2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      type: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
  },
  socialLinks: {
    select: { id: true, platform: true, url: true },
    orderBy: { createdAt: "asc" as const },
  },
  _count: { select: { deals: true, activities: true } },
} satisfies Prisma.ContactSelect;

export const dealSelect = {
  id: true,
  title: true,
  value: true,
  currency: true,
  stage: true,
  pipelineId: true,
  pipelineStageId: true,
  contactId: true,
  companyId: true,
  leadId: true,
  ownerId: true,
  probability: true,
  expectedCloseDate: true,
  description: true,
  winReason: true,
  lossReason: true,
  competitor: true,
  closedAt: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      email: true,
    },
  },
  company: {
    select: {
      id: true,
      name: true,
      domain: true,
    },
  },
  pipelineStage: {
    select: {
      id: true,
      name: true,
      stageKey: true,
      probability: true,
      isClosed: true,
      isWon: true,
    },
  },
  owner: { select: ownerSelect },
  tags: { select: tagRelationSelect },
} satisfies Prisma.DealSelect;

type CompanyRow = Prisma.CompanyGetPayload<{ select: typeof companySelect }>;
type ContactRow = Prisma.ContactGetPayload<{ select: typeof contactSelect }>;
type DealRow = Prisma.DealGetPayload<{ select: typeof dealSelect }>;

export const mapOwner = (owner: { id: string; email: string | null } | null) =>
  owner ? { id: owner.id, email: owner.email } : null;

export const mapTags = (
  entries: Array<{ tag: { id: string; name: string; color: string } }>,
) => entries.map((entry) => ({ id: entry.tag.id, name: entry.tag.name, color: entry.tag.color }));

export const mapCompany = (company: CompanyRow) => ({
  id: company.id,
  name: company.name,
  domain: company.domain,
  industry: company.industry,
  size: company.size,
  website: company.website,
  address: company.address,
  parentCompanyId: company.parentCompanyId,
  parentCompany: company.parentCompany,
  employeeCount: company.employeeCount,
  annualRevenue: company.annualRevenue !== null ? Number(company.annualRevenue) : null,
  revenueCurrency: company.revenueCurrency,
  ownershipPercent:
    company.ownershipPercent !== null ? Number(company.ownershipPercent) : null,
  ownerId: company.ownerId,
  notes: company.notes,
  owner: mapOwner(company.owner),
  locations: company.locations.map((entry) => ({
    id: entry.id,
    label: entry.label,
    line1: entry.line1,
    line2: entry.line2,
    city: entry.city,
    state: entry.state,
    postalCode: entry.postalCode,
    country: entry.country,
    isPrimary: entry.isPrimary,
    isHeadquarters: entry.isHeadquarters,
  })),
  contactCount: company._count.contacts,
  subsidiaryCount: company._count.subsidiaries,
  createdAt: company.createdAt,
  updatedAt: company.updatedAt,
});

export const mapContact = (contact: ContactRow) => ({
  id: contact.id,
  firstName: contact.firstName,
  lastName: contact.lastName,
  fullName: `${contact.firstName} ${contact.lastName}`.trim(),
  email: contact.email,
  phone: contact.phone,
  company: contact.company ?? contact.companyRef?.name ?? null,
  companyId: contact.companyId,
  companyRef: contact.companyRef,
  jobTitle: contact.jobTitle,
  status: contact.status,
  leadSource: contact.leadSource,
  sourceDetail: contact.sourceDetail,
  notes: contact.notes,
  ownerId: contact.ownerId,
  owner: mapOwner(contact.owner),
  tags: mapTags(contact.tags),
  emails: contact.emails.map((entry) => ({
    id: entry.id,
    email: entry.email,
    type: entry.type,
    isPrimary: entry.isPrimary,
  })),
  phones: contact.phones.map((entry) => ({
    id: entry.id,
    phone: entry.phone,
    type: entry.type,
    isPrimary: entry.isPrimary,
  })),
  addresses: contact.addresses.map((entry) => ({
    id: entry.id,
    label: entry.label,
    line1: entry.line1,
    line2: entry.line2,
    city: entry.city,
    state: entry.state,
    postalCode: entry.postalCode,
    country: entry.country,
    type: entry.type,
    isPrimary: entry.isPrimary,
  })),
  socialLinks: contact.socialLinks.map((entry) => ({
    id: entry.id,
    platform: entry.platform,
    url: entry.url,
  })),
  dealCount: contact._count.deals,
  activityCount: contact._count.activities,
  createdAt: contact.createdAt,
  updatedAt: contact.updatedAt,
});

export const mapDeal = (deal: DealRow) => {
  const stageProbability = deal.pipelineStage?.probability ?? 0;
  const probability = resolveDealProbability(deal.probability, stageProbability);
  const value = Number(deal.value);

  return {
    id: deal.id,
    title: deal.title,
    value,
    currency: deal.currency,
    stage: deal.stage,
    pipelineId: deal.pipelineId,
    pipelineStageId: deal.pipelineStageId,
    contactId: deal.contactId,
    companyId: deal.companyId,
    leadId: deal.leadId,
    ownerId: deal.ownerId,
    probability,
    weightedValue: computeWeightedValue(value, probability),
    expectedCloseDate: deal.expectedCloseDate,
    description: deal.description,
    winReason: deal.winReason,
    lossReason: deal.lossReason,
    competitor: deal.competitor,
    closedAt: deal.closedAt,
    sortOrder: deal.sortOrder,
    contact: deal.contact
      ? {
          id: deal.contact.id,
          fullName: `${deal.contact.firstName} ${deal.contact.lastName}`.trim(),
          company: deal.contact.company,
          email: deal.contact.email,
        }
      : null,
    company: deal.company
      ? {
          id: deal.company.id,
          name: deal.company.name,
          domain: deal.company.domain,
        }
      : null,
    pipelineStage: deal.pipelineStage
      ? {
          id: deal.pipelineStage.id,
          name: deal.pipelineStage.name,
          stageKey: deal.pipelineStage.stageKey,
          probability: deal.pipelineStage.probability,
          isClosed: deal.pipelineStage.isClosed,
          isWon: deal.pipelineStage.isWon,
        }
      : null,
    owner: mapOwner(deal.owner),
    tags: mapTags(deal.tags),
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
};

export const mapTag = (tag: { id: string; name: string; color: string; createdAt?: Date }) => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
  createdAt: tag.createdAt,
});
