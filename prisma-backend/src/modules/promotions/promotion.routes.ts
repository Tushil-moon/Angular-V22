import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./promotion.controller";
import {
  createPromotionSchema,
  listPromotionsQuerySchema,
  promotionIdParamSchema,
  updatePromotionSchema,
} from "./promotion.validation";

export const promotionRouter = Router();

const canRead = requirePermission(Permissions.ReadPromotions, Permissions.ManagePromotions);
const canManage = requirePermission(Permissions.ManagePromotions);

promotionRouter.use(authenticate);

promotionRouter.get("/", canRead, validate({ query: listPromotionsQuerySchema }), controller.listPromotions);
promotionRouter.post("/", canManage, validate({ body: createPromotionSchema }), controller.createPromotion);
promotionRouter.get("/:id", canRead, validate({ params: promotionIdParamSchema }), controller.getPromotion);
promotionRouter.patch(
  "/:id",
  canManage,
  validate({ params: promotionIdParamSchema, body: updatePromotionSchema }),
  controller.updatePromotion,
);
promotionRouter.delete(
  "/:id",
  canManage,
  validate({ params: promotionIdParamSchema }),
  controller.deletePromotion,
);
