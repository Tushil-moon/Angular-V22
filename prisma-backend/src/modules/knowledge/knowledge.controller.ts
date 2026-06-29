import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListKnowledgeArticlesQuery } from "./knowledge.validation";
import { knowledgeService } from "./knowledge.service";

export const listArticles = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListKnowledgeArticlesQuery>(req);
  const result = await knowledgeService.listArticles(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getArticle = asyncHandler(async (req, res) => {
  const item = await knowledgeService.getArticleById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createArticle = asyncHandler(async (req, res) => {
  const item = await knowledgeService.createArticle(req.body, getAuthContext(req));
  return sendCreated(res, item, "Knowledge article created");
});

export const updateArticle = asyncHandler(async (req, res) => {
  const item = await knowledgeService.updateArticle(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Knowledge article updated");
});

export const deleteArticle = asyncHandler(async (req, res) => {
  await knowledgeService.deleteArticle(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Knowledge article deleted");
});
