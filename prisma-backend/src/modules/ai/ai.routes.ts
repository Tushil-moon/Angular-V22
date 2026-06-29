import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./ai.controller";
import {
  aiFeatureFlagIdParamSchema,
  aiInsightIdParamSchema,
  createAiFeatureFlagSchema,
  createAiInsightSchema,
  listAiFeatureFlagsQuerySchema,
  listAiInsightsQuerySchema,
  updateAiFeatureFlagSchema,
} from "./ai.validation";

export const aiRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

aiRouter.use(authenticate, resolveOrganization);

aiRouter.get("/flags", canRead, validate({ query: listAiFeatureFlagsQuerySchema }), controller.listFeatureFlags);
aiRouter.post("/flags", canManage, validate({ body: createAiFeatureFlagSchema }), controller.createFeatureFlag);
aiRouter.get("/flags/:id", canRead, validate({ params: aiFeatureFlagIdParamSchema }), controller.getFeatureFlag);
aiRouter.patch(
  "/flags/:id",
  canManage,
  validate({ params: aiFeatureFlagIdParamSchema, body: updateAiFeatureFlagSchema }),
  controller.updateFeatureFlag,
);
aiRouter.delete("/flags/:id", canManage, validate({ params: aiFeatureFlagIdParamSchema }), controller.deleteFeatureFlag);

aiRouter.get("/insights", canRead, validate({ query: listAiInsightsQuerySchema }), controller.listInsights);
aiRouter.post("/insights", canManage, validate({ body: createAiInsightSchema }), controller.createInsight);
aiRouter.get("/insights/:id", canRead, validate({ params: aiInsightIdParamSchema }), controller.getInsight);
aiRouter.delete("/insights/:id", canManage, validate({ params: aiInsightIdParamSchema }), controller.deleteInsight);
