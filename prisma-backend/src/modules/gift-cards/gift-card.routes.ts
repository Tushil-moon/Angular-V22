import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./gift-card.controller";
import {
  createGiftCardSchema,
  giftCardIdParamSchema,
  listGiftCardsQuerySchema,
  updateGiftCardSchema,
} from "./gift-card.validation";

export const giftCardRouter = Router();

const canRead = requirePermission(Permissions.ReadGiftCards, Permissions.ManageGiftCards);
const canManage = requirePermission(Permissions.ManageGiftCards);

giftCardRouter.use(authenticate);

giftCardRouter.get("/", canRead, validate({ query: listGiftCardsQuerySchema }), controller.listGiftCards);
giftCardRouter.post("/", canManage, validate({ body: createGiftCardSchema }), controller.createGiftCard);
giftCardRouter.get("/:id", canRead, validate({ params: giftCardIdParamSchema }), controller.getGiftCard);
giftCardRouter.patch(
  "/:id",
  canManage,
  validate({ params: giftCardIdParamSchema, body: updateGiftCardSchema }),
  controller.updateGiftCard,
);
