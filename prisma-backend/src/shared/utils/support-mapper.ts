import type { Prisma } from "@prisma/client";

const userSelect = { id: true, email: true } as const;

export const caseCommentSelect = {
  id: true,
  caseId: true,
  userId: true,
  body: true,
  isInternal: true,
  createdAt: true,
  user: { select: userSelect },
} satisfies Prisma.CaseCommentSelect;

export const caseSelect = {
  id: true,
  organizationId: true,
  caseNumber: true,
  subject: true,
  description: true,
  status: true,
  priority: true,
  contactId: true,
  companyId: true,
  assigneeId: true,
  queueId: true,
  slaPolicyId: true,
  firstResponseDueAt: true,
  resolutionDueAt: true,
  firstRespondedAt: true,
  resolvedAt: true,
  closedAt: true,
  slaBreached: true,
  createdAt: true,
  updatedAt: true,
  contact: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
  assignee: { select: userSelect },
  queue: { select: { id: true, name: true } },
  slaPolicy: { select: { id: true, name: true, firstResponseHours: true, resolutionHours: true } },
  comments: { orderBy: { createdAt: "asc" }, select: caseCommentSelect },
} satisfies Prisma.CaseSelect;

type CaseRow = Prisma.CaseGetPayload<{ select: typeof caseSelect }>;

const mapUser = (user: { id: string; email: string | null } | null) =>
  user ? { id: user.id, email: user.email } : null;

export const mapCaseComment = (comment: Prisma.CaseCommentGetPayload<{ select: typeof caseCommentSelect }>) => ({
  id: comment.id,
  caseId: comment.caseId,
  userId: comment.userId,
  body: comment.body,
  isInternal: comment.isInternal,
  createdAt: comment.createdAt,
  user: mapUser(comment.user),
});

export const mapCase = (item: CaseRow) => ({
  id: item.id,
  organizationId: item.organizationId,
  caseNumber: item.caseNumber,
  subject: item.subject,
  description: item.description,
  status: item.status,
  priority: item.priority,
  contactId: item.contactId,
  companyId: item.companyId,
  assigneeId: item.assigneeId,
  queueId: item.queueId,
  slaPolicyId: item.slaPolicyId,
  firstResponseDueAt: item.firstResponseDueAt,
  resolutionDueAt: item.resolutionDueAt,
  firstRespondedAt: item.firstRespondedAt,
  resolvedAt: item.resolvedAt,
  closedAt: item.closedAt,
  slaBreached: item.slaBreached,
  contact: item.contact
    ? {
        id: item.contact.id,
        fullName: `${item.contact.firstName} ${item.contact.lastName}`.trim(),
      }
    : null,
  company: item.company,
  assignee: mapUser(item.assignee),
  queue: item.queue,
  slaPolicy: item.slaPolicy,
  comments: item.comments.map(mapCaseComment),
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

export const knowledgeArticleSelect = {
  id: true,
  organizationId: true,
  title: true,
  slug: true,
  summary: true,
  body: true,
  category: true,
  published: true,
  publishedAt: true,
  viewCount: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: { select: userSelect },
} satisfies Prisma.KnowledgeArticleSelect;

type KnowledgeRow = Prisma.KnowledgeArticleGetPayload<{ select: typeof knowledgeArticleSelect }>;

export const mapKnowledgeArticle = (article: KnowledgeRow) => ({
  id: article.id,
  organizationId: article.organizationId,
  title: article.title,
  slug: article.slug,
  summary: article.summary,
  body: article.body,
  category: article.category,
  published: article.published,
  publishedAt: article.publishedAt,
  viewCount: article.viewCount,
  authorId: article.authorId,
  author: mapUser(article.author),
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
});

export const slaPolicySelect = {
  id: true,
  organizationId: true,
  name: true,
  description: true,
  priority: true,
  firstResponseHours: true,
  resolutionHours: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SlaPolicySelect;

type SlaPolicyRow = Prisma.SlaPolicyGetPayload<{ select: typeof slaPolicySelect }>;

export const mapSlaPolicy = (policy: SlaPolicyRow) => ({
  id: policy.id,
  organizationId: policy.organizationId,
  name: policy.name,
  description: policy.description,
  priority: policy.priority,
  firstResponseHours: policy.firstResponseHours,
  resolutionHours: policy.resolutionHours,
  active: policy.active,
  createdAt: policy.createdAt,
  updatedAt: policy.updatedAt,
});

export const queueSelect = {
  id: true,
  organizationId: true,
  name: true,
  description: true,
  slaPolicyId: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  slaPolicy: { select: { id: true, name: true } },
} satisfies Prisma.QueueSelect;

type QueueRow = Prisma.QueueGetPayload<{ select: typeof queueSelect }>;

export const mapQueue = (queue: QueueRow) => ({
  id: queue.id,
  organizationId: queue.organizationId,
  name: queue.name,
  description: queue.description,
  slaPolicyId: queue.slaPolicyId,
  isDefault: queue.isDefault,
  slaPolicy: queue.slaPolicy,
  createdAt: queue.createdAt,
  updatedAt: queue.updatedAt,
});

export const mapCaseHistoryEntry = (entry: {
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
