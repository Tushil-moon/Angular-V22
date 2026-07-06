import { AppError } from "../../shared/errors/app-error";
import { mapKnowledgeArticle } from "../../shared/utils/support-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { slugify } from "../cases/case.utils";
import { knowledgeRepository } from "./knowledge.repository";
import { buildKnowledgeListWhere } from "./knowledge.utils";
import type {
  CreateKnowledgeArticleInput,
  ListKnowledgeArticlesQuery,
  UpdateKnowledgeArticleInput,
} from "./knowledge.validation";

const ensureUniqueSlug = async (organizationId: string, title: string, slug?: string, excludeId?: string) => {
  const base = slugify(slug || title) || `article-${Date.now()}`;
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await knowledgeRepository.findBySlug(organizationId, candidate);
    if (!existing || existing.id === excludeId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
};

export const knowledgeService = {
  async listArticles(query: ListKnowledgeArticlesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildKnowledgeListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      knowledgeRepository.findMany(where, skip, query.pageSize),
      knowledgeRepository.count(where),
    ]);

    return { data: data.map(mapKnowledgeArticle), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getArticleById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await knowledgeRepository.findById({ id, organizationId });
    if (!item) throw new AppError(404, "Knowledge article not found", "KNOWLEDGE_ARTICLE_NOT_FOUND");
    return mapKnowledgeArticle(item);
  },

  async createArticle(input: CreateKnowledgeArticleInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const slug = await ensureUniqueSlug(organizationId, input.title, input.slug);
    const published = input.published ?? false;

    const item = await knowledgeRepository.create({
      organization: { connect: { id: organizationId } },
      title: input.title,
      slug,
      summary: input.summary,
      body: input.body,
      category: input.category,
      published,
      publishedAt: published ? new Date() : null,
      author: auth.userId ? { connect: { id: auth.userId } } : undefined,
    });

    return mapKnowledgeArticle(item);
  },

  async updateArticle(id: string, input: UpdateKnowledgeArticleInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await knowledgeRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Knowledge article not found", "KNOWLEDGE_ARTICLE_NOT_FOUND");

    let slug: string | null | undefined;
    if (input.slug !== undefined || input.title) {
      slug =
        input.slug === null
          ? null
          : await ensureUniqueSlug(
              organizationId,
              input.title ?? existing.title,
              input.slug ?? existing.slug ?? undefined,
              id,
            );
    }

    let publishedAt = existing.publishedAt;
    if (input.published === true && !existing.published) publishedAt = new Date();
    if (input.published === false) publishedAt = null;

    const item = await knowledgeRepository.update(id, {
      title: input.title,
      summary: input.summary === null ? null : input.summary,
      body: input.body,
      category: input.category === null ? null : input.category,
      slug,
      published: input.published,
      publishedAt,
    });

    return mapKnowledgeArticle(item);
  },

  async deleteArticle(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await knowledgeRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Knowledge article not found", "KNOWLEDGE_ARTICLE_NOT_FOUND");
    await knowledgeRepository.delete(id);
  },

  async publishArticle(id: string, auth: AuthContext) {
    return this.updateArticle(id, { published: true }, auth);
  },

  async unpublishArticle(id: string, auth: AuthContext) {
    return this.updateArticle(id, { published: false }, auth);
  },

  async recordArticleView(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await knowledgeRepository.findById({ id, organizationId, published: true });
    if (!existing) throw new AppError(404, "Knowledge article not found", "KNOWLEDGE_ARTICLE_NOT_FOUND");
    const item = await knowledgeRepository.incrementViews(id);
    return mapKnowledgeArticle(item);
  },
};
