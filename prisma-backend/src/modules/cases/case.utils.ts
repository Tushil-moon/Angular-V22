import type { CasePriority, CaseStatus, Prisma } from "@prisma/client";

import type { ListCasesQuery } from "./case.validation";

export const generateCaseNumber = (sequence: number) => {
  const year = new Date().getFullYear();
  return `CS-${year}-${String(sequence).padStart(4, "0")}`;
};

export const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export const addHours = (date: Date, hours: number) => new Date(date.getTime() + hours * 60 * 60 * 1000);

export const buildCaseListWhere = (
  query: ListCasesQuery,
  organizationId: string,
): Prisma.CaseWhereInput => {
  const filters: Prisma.CaseWhereInput = { organizationId };

  if (query.status) filters.status = query.status;
  if (query.priority) filters.priority = query.priority;
  if (query.assigneeId) filters.assigneeId = query.assigneeId;
  if (query.queueId) filters.queueId = query.queueId;
  if (query.slaBreached !== undefined) filters.slaBreached = query.slaBreached;

  const search = query.search?.trim();
  if (search) {
    filters.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { caseNumber: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  return filters;
};

export const assertCaseTransition = (current: CaseStatus, next: CaseStatus) => {
  const allowed: Record<CaseStatus, CaseStatus[]> = {
    OPEN: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
    IN_PROGRESS: ["OPEN", "RESOLVED", "CLOSED"],
    RESOLVED: ["CLOSED", "OPEN"],
    CLOSED: ["OPEN"],
  };

  if (!allowed[current].includes(next)) {
    throw new Error(`Cannot transition case from ${current} to ${next}`);
  }
};

export const evaluateSlaBreaches = (item: {
  slaBreached: boolean;
  status: CaseStatus;
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  now?: Date;
}) => {
  if (item.slaBreached || item.status === "CLOSED") return false;

  const now = item.now ?? new Date();
  const responseBreached =
    !item.firstRespondedAt && item.firstResponseDueAt != null && item.firstResponseDueAt < now;
  const resolutionBreached =
    !item.resolvedAt &&
    item.resolutionDueAt != null &&
    item.resolutionDueAt < now &&
    item.status !== "RESOLVED";

  return responseBreached || resolutionBreached;
};

export const resolveSlaDueDates = (
  policy: { firstResponseHours: number; resolutionHours: number },
  createdAt = new Date(),
) => ({
  firstResponseDueAt: addHours(createdAt, policy.firstResponseHours),
  resolutionDueAt: addHours(createdAt, policy.resolutionHours),
});

export const findMatchingSlaPolicy = <
  T extends { priority: CasePriority; active: boolean },
>(
  policies: T[],
  priority: CasePriority,
) => {
  const active = policies.filter((policy) => policy.active);
  return (
    active.find((policy) => policy.priority === priority) ??
    active.find((policy) => policy.priority === "MEDIUM") ??
    active[0] ??
    null
  );
};
