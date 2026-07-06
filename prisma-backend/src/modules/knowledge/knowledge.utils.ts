import type { Prisma } from "@prisma/client";

import type { ListKnowledgeArticlesQuery } from "./knowledge.validation";

export const buildKnowledgeListWhere = (
  query: ListKnowledgeArticlesQuery,
  organizationId: string,
): Prisma.KnowledgeArticleWhereInput => {
  const filters: Prisma.KnowledgeArticleWhereInput = { organizationId };

  if (query.published !== undefined) filters.published = query.published;
  if (query.category) filters.category = query.category;

  const search = query.search?.trim();
  if (search) {
    filters.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  return filters;
};
