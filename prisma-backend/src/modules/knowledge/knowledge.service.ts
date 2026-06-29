import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateKnowledgeArticleInput, ListKnowledgeArticlesQuery, UpdateKnowledgeArticleInput } from "./knowledge.validation";

export const knowledgeService = {
  async listArticles(query: ListKnowledgeArticlesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const search = query.search?.trim() ?? "";
    const where = {
      organizationId,
      ...(query.published !== undefined ? { published: query.published } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { body: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.knowledgeArticle.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take: query.pageSize }),
      prisma.knowledgeArticle.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getArticleById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.knowledgeArticle.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "Knowledge article not found", "KNOWLEDGE_ARTICLE_NOT_FOUND");
    return item;
  },

  async createArticle(input: CreateKnowledgeArticleInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    return prisma.knowledgeArticle.create({ data: { ...input, organizationId } });
  },

  async updateArticle(id: string, input: UpdateKnowledgeArticleInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.knowledgeArticle.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Knowledge article not found", "KNOWLEDGE_ARTICLE_NOT_FOUND");
    return prisma.knowledgeArticle.update({ where: { id }, data: input });
  },

  async deleteArticle(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.knowledgeArticle.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Knowledge article not found", "KNOWLEDGE_ARTICLE_NOT_FOUND");
    await prisma.knowledgeArticle.delete({ where: { id } });
  },
};
