import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { knowledgeArticleSelect } from "../../shared/utils/support-mapper";

export const knowledgeRepository = {
  findMany(where: Prisma.KnowledgeArticleWhereInput, skip: number, take: number) {
    return prisma.knowledgeArticle.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: knowledgeArticleSelect,
    });
  },

  count(where: Prisma.KnowledgeArticleWhereInput) {
    return prisma.knowledgeArticle.count({ where });
  },

  findById(where: Prisma.KnowledgeArticleWhereInput) {
    return prisma.knowledgeArticle.findFirst({ where, select: knowledgeArticleSelect });
  },

  findBySlug(organizationId: string, slug: string) {
    return prisma.knowledgeArticle.findFirst({
      where: { organizationId, slug },
      select: knowledgeArticleSelect,
    });
  },

  create(data: Prisma.KnowledgeArticleCreateInput) {
    return prisma.knowledgeArticle.create({ data, select: knowledgeArticleSelect });
  },

  update(id: string, data: Prisma.KnowledgeArticleUpdateInput) {
    return prisma.knowledgeArticle.update({ where: { id }, data, select: knowledgeArticleSelect });
  },

  delete(id: string) {
    return prisma.knowledgeArticle.delete({ where: { id } });
  },

  incrementViews(id: string) {
    return prisma.knowledgeArticle.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: knowledgeArticleSelect,
    });
  },
};
