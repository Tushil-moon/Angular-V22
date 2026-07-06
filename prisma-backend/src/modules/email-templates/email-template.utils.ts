import type { Prisma } from "@prisma/client";

import type { ListEmailTemplatesQuery } from "./email-template.validation";

export const buildEmailTemplateListWhere = (
  query: ListEmailTemplatesQuery,
  organizationId: string,
): Prisma.EmailTemplateWhereInput => {
  const filters: Prisma.EmailTemplateWhereInput = { organizationId };
  if (query.active !== undefined) filters.active = query.active;
  if (query.category) filters.category = query.category;

  const search = query.search?.trim();
  if (search) {
    filters.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  return filters;
};
