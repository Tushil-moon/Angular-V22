import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createKnowledgeArticleSchema = z.object({
  title: z.string().trim().min(1).max(300),
  body: z.string().min(1),
  published: z.boolean().optional(),
});

export const updateKnowledgeArticleSchema = createKnowledgeArticleSchema.partial();

export const knowledgeArticleIdParamSchema = z.object({ id: z.string().uuid() });

export const listKnowledgeArticlesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  published: z.coerce.boolean().optional(),
});

export type CreateKnowledgeArticleInput = z.infer<typeof createKnowledgeArticleSchema>;
export type UpdateKnowledgeArticleInput = z.infer<typeof updateKnowledgeArticleSchema>;
export type ListKnowledgeArticlesQuery = z.infer<typeof listKnowledgeArticlesQuerySchema>;
