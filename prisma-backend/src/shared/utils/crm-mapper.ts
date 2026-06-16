import type { Prisma } from "@prisma/client";

export const ownerSelect = {
  id: true,
  email: true,
} satisfies Prisma.UserSelect;

export const contactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  company: true,
  jobTitle: true,
  status: true,
  notes: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: ownerSelect },
  _count: { select: { deals: true, activities: true } },
} satisfies Prisma.ContactSelect;

export const dealSelect = {
  id: true,
  title: true,
  value: true,
  currency: true,
  stage: true,
  contactId: true,
  ownerId: true,
  expectedCloseDate: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
    },
  },
  owner: { select: ownerSelect },
} satisfies Prisma.DealSelect;

export const activitySelect = {
  id: true,
  type: true,
  subject: true,
  body: true,
  contactId: true,
  dealId: true,
  userId: true,
  createdAt: true,
  user: { select: ownerSelect },
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  deal: {
    select: {
      id: true,
      title: true,
    },
  },
} satisfies Prisma.ActivitySelect;

type ContactRow = Prisma.ContactGetPayload<{ select: typeof contactSelect }>;
type DealRow = Prisma.DealGetPayload<{ select: typeof dealSelect }>;
type ActivityRow = Prisma.ActivityGetPayload<{ select: typeof activitySelect }>;

export const mapOwner = (owner: { id: string; email: string | null } | null) =>
  owner
    ? {
        id: owner.id,
        email: owner.email,
      }
    : null;

export const mapContact = (contact: ContactRow) => ({
  id: contact.id,
  firstName: contact.firstName,
  lastName: contact.lastName,
  fullName: `${contact.firstName} ${contact.lastName}`.trim(),
  email: contact.email,
  phone: contact.phone,
  company: contact.company,
  jobTitle: contact.jobTitle,
  status: contact.status,
  notes: contact.notes,
  ownerId: contact.ownerId,
  owner: mapOwner(contact.owner),
  dealCount: contact._count.deals,
  activityCount: contact._count.activities,
  createdAt: contact.createdAt,
  updatedAt: contact.updatedAt,
});

export const mapDeal = (deal: DealRow) => ({
  id: deal.id,
  title: deal.title,
  value: Number(deal.value),
  currency: deal.currency,
  stage: deal.stage,
  contactId: deal.contactId,
  ownerId: deal.ownerId,
  expectedCloseDate: deal.expectedCloseDate,
  description: deal.description,
  contact: deal.contact
    ? {
        id: deal.contact.id,
        fullName: `${deal.contact.firstName} ${deal.contact.lastName}`.trim(),
        company: deal.contact.company,
      }
    : null,
  owner: mapOwner(deal.owner),
  createdAt: deal.createdAt,
  updatedAt: deal.updatedAt,
});

export const mapActivity = (activity: ActivityRow) => ({
  id: activity.id,
  type: activity.type,
  subject: activity.subject,
  body: activity.body,
  contactId: activity.contactId,
  dealId: activity.dealId,
  userId: activity.userId,
  user: mapOwner(activity.user),
  contact: activity.contact
    ? {
        id: activity.contact.id,
        fullName: `${activity.contact.firstName} ${activity.contact.lastName}`.trim(),
      }
    : null,
  deal: activity.deal,
  createdAt: activity.createdAt,
});
