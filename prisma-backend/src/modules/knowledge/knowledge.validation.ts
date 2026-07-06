import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createKnowledgeArticleSchema = z.object({
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(500).optional(),
  body: z.string().min(1),
  category: z.string().trim().max(100).optional(),
  slug: z.string().trim().max(150).optional(),
  published: z.boolean().optional(),
});

export const updateKnowledgeArticleSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  summary: z.string().trim().max(500).nullable().optional(),
  body: z.string().min(1).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  slug: z.string().trim().max(150).nullable().optional(),
  published: z.boolean().optional(),
});

export const knowledgeArticleIdParamSchema = z.object({ id: z.string().uuid() });

export const listKnowledgeArticlesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  published: z.coerce.boolean().optional(),
  category: z.string().optional(),
});

export type CreateKnowledgeArticleInput = z.infer<typeof createKnowledgeArticleSchema>;
export type UpdateKnowledgeArticleInput = z.infer<typeof updateKnowledgeArticleSchema>;
export type ListKnowledgeArticlesQuery = z.infer<typeof listKnowledgeArticlesQuerySchema>;
