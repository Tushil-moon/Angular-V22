import type { Prisma } from "@prisma/client";

const userSelect = { id: true, email: true } as const;

export const campaignMemberSelect = {
  id: true,
  campaignId: true,
  contactId: true,
  status: true,
  contact: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.CampaignMemberSelect;

export const campaignSelect = {
  id: true,
  organizationId: true,
  ownerId: true,
  emailTemplateId: true,
  emailSequenceId: true,
  name: true,
  description: true,
  type: true,
  status: true,
  budget: true,
  sentCount: true,
  openedCount: true,
  clickedCount: true,
  startDate: true,
  endDate: true,
  activatedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: userSelect },
  emailTemplate: { select: { id: true, name: true, subject: true } },
  emailSequence: { select: { id: true, name: true } },
  members: { select: campaignMemberSelect },
} satisfies Prisma.CampaignSelect;

type CampaignRow = Prisma.CampaignGetPayload<{ select: typeof campaignSelect }>;

const mapUser = (user: { id: string; email: string | null } | null) =>
  user ? { id: user.id, email: user.email } : null;

const toNumber = (value: Prisma.Decimal | number | null) =>
  value == null ? null : Number(value);

export const mapCampaignMember = (
  member: Prisma.CampaignMemberGetPayload<{ select: typeof campaignMemberSelect }>,
) => ({
  id: member.id,
  campaignId: member.campaignId,
  contactId: member.contactId,
  status: member.status,
  contact: member.contact
    ? {
        id: member.contact.id,
        fullName: `${member.contact.firstName} ${member.contact.lastName}`.trim(),
        email: member.contact.email,
      }
    : null,
});

export const mapCampaign = (campaign: CampaignRow) => ({
  id: campaign.id,
  organizationId: campaign.organizationId,
  ownerId: campaign.ownerId,
  emailTemplateId: campaign.emailTemplateId,
  emailSequenceId: campaign.emailSequenceId,
  name: campaign.name,
  description: campaign.description,
  type: campaign.type,
  status: campaign.status,
  budget: toNumber(campaign.budget),
  sentCount: campaign.sentCount,
  openedCount: campaign.openedCount,
  clickedCount: campaign.clickedCount,
  startDate: campaign.startDate,
  endDate: campaign.endDate,
  activatedAt: campaign.activatedAt,
  completedAt: campaign.completedAt,
  owner: mapUser(campaign.owner),
  emailTemplate: campaign.emailTemplate,
  emailSequence: campaign.emailSequence,
  members: campaign.members.map(mapCampaignMember),
  createdAt: campaign.createdAt,
  updatedAt: campaign.updatedAt,
});

export const emailTemplateSelect = {
  id: true,
  organizationId: true,
  name: true,
  subject: true,
  bodyHtml: true,
  category: true,
  previewText: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EmailTemplateSelect;

type EmailTemplateRow = Prisma.EmailTemplateGetPayload<{ select: typeof emailTemplateSelect }>;

export const mapEmailTemplate = (template: EmailTemplateRow) => ({
  id: template.id,
  organizationId: template.organizationId,
  name: template.name,
  subject: template.subject,
  bodyHtml: template.bodyHtml,
  category: template.category,
  previewText: template.previewText,
  active: template.active,
  createdAt: template.createdAt,
  updatedAt: template.updatedAt,
});

export const sequenceStepSelect = {
  id: true,
  sequenceId: true,
  order: true,
  delayDays: true,
  templateId: true,
  template: { select: { id: true, name: true, subject: true } },
} satisfies Prisma.SequenceStepSelect;

export const emailSequenceSelect = {
  id: true,
  organizationId: true,
  name: true,
  description: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  steps: { orderBy: { order: "asc" }, select: sequenceStepSelect },
} satisfies Prisma.EmailSequenceSelect;

type EmailSequenceRow = Prisma.EmailSequenceGetPayload<{ select: typeof emailSequenceSelect }>;

export const mapSequenceStep = (
  step: Prisma.SequenceStepGetPayload<{ select: typeof sequenceStepSelect }>,
) => ({
  id: step.id,
  sequenceId: step.sequenceId,
  order: step.order,
  delayDays: step.delayDays,
  templateId: step.templateId,
  template: step.template,
});

export const mapEmailSequence = (sequence: EmailSequenceRow) => ({
  id: sequence.id,
  organizationId: sequence.organizationId,
  name: sequence.name,
  description: sequence.description,
  active: sequence.active,
  steps: sequence.steps.map(mapSequenceStep),
  createdAt: sequence.createdAt,
  updatedAt: sequence.updatedAt,
});

export const mapCampaignHistoryEntry = (entry: {
  id: string;
  action: string;
  details: unknown;
  createdAt: Date;
  user: { id: string; email: string | null } | null;
}) => ({
  id: entry.id,
  action: entry.action,
  details: entry.details,
  createdAt: entry.createdAt,
  user: mapUser(entry.user),
});
