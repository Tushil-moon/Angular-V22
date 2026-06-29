import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./lead-score.controller";
import {
  createLeadScoreRuleSchema,
  leadScoreRuleIdParamSchema,
  listLeadScoreRulesQuerySchema,
  updateLeadScoreRuleSchema,
} from "./lead-score.validation";

export const leadScoreRouter = Router();

const canRead = requirePermission(Permissions.ReadContacts);
const canManage = requirePermission(Permissions.ManageContacts);

leadScoreRouter.use(authenticate, resolveOrganization);

leadScoreRouter.get("/", canRead, validate({ query: listLeadScoreRulesQuerySchema }), controller.listRules);
leadScoreRouter.post("/", canManage, validate({ body: createLeadScoreRuleSchema }), controller.createRule);
leadScoreRouter.get("/:id", canRead, validate({ params: leadScoreRuleIdParamSchema }), controller.getRule);
leadScoreRouter.patch(
  "/:id",
  canManage,
  validate({ params: leadScoreRuleIdParamSchema, body: updateLeadScoreRuleSchema }),
  controller.updateRule,
);
leadScoreRouter.delete("/:id", canManage, validate({ params: leadScoreRuleIdParamSchema }), controller.deleteRule);
