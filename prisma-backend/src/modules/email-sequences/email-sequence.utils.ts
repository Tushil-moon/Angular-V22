import type { Prisma } from "@prisma/client";

import type { ListEmailSequencesQuery } from "./email-sequence.validation";

export const buildEmailSequenceListWhere = (
  query: ListEmailSequencesQuery,
  organizationId: string,
): Prisma.EmailSequenceWhereInput => {
  const filters: Prisma.EmailSequenceWhereInput = { organizationId };
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

export const normalizeSequenceSteps = (
  steps: Array<{ order: number; delayDays?: number; templateId: string }>,
) =>
  steps
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((step, index) => ({
      order: step.order ?? index,
      delayDays: step.delayDays ?? 0,
      templateId: step.templateId,
    }));
