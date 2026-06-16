import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Roles } from "../../shared/constants/roles";
import * as controller from "./deal.controller";
import {
  createDealSchema,
  dealIdParamSchema,
  listDealsQuerySchema,
  updateDealSchema,
} from "./deal.validation";

export const dealRouter = Router();

const canManage = authorize(Roles.Admin, Roles.Manager);

dealRouter.get("/pipeline", authenticate, controller.getPipeline);
dealRouter.get("/", authenticate, validate({ query: listDealsQuerySchema }), controller.listDeals);
dealRouter.post("/", authenticate, canManage, validate({ body: createDealSchema }), controller.createDeal);
dealRouter.get("/:id", authenticate, validate({ params: dealIdParamSchema }), controller.getDeal);
dealRouter.patch(
  "/:id",
  authenticate,
  canManage,
  validate({ params: dealIdParamSchema, body: updateDealSchema }),
  controller.updateDeal,
);
dealRouter.delete(
  "/:id",
  authenticate,
  canManage,
  validate({ params: dealIdParamSchema }),
  controller.deleteDeal,
);
