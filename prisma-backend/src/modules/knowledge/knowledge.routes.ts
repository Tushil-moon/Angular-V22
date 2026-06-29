import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./knowledge.controller";
import {
  createKnowledgeArticleSchema,
  knowledgeArticleIdParamSchema,
  listKnowledgeArticlesQuerySchema,
  updateKnowledgeArticleSchema,
} from "./knowledge.validation";

export const knowledgeRouter = Router();

const canRead = requirePermission(Permissions.ReadActivities);
const canManage = requirePermission(Permissions.ManageActivities);

knowledgeRouter.use(authenticate, resolveOrganization);

knowledgeRouter.get("/", canRead, validate({ query: listKnowledgeArticlesQuerySchema }), controller.listArticles);
knowledgeRouter.post("/", canManage, validate({ body: createKnowledgeArticleSchema }), controller.createArticle);
knowledgeRouter.get("/:id", canRead, validate({ params: knowledgeArticleIdParamSchema }), controller.getArticle);
knowledgeRouter.patch(
  "/:id",
  canManage,
  validate({ params: knowledgeArticleIdParamSchema, body: updateKnowledgeArticleSchema }),
  controller.updateArticle,
);
knowledgeRouter.delete("/:id", canManage, validate({ params: knowledgeArticleIdParamSchema }), controller.deleteArticle);
