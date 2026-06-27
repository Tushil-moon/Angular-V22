import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./deal.controller";
import {
  createDealSchema,
  dealIdParamSchema,
  listDealsQuerySchema,
  updateDealSchema,
} from "./deal.validation";

export const dealRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

dealRouter.use(authenticate, resolveOrganization);

dealRouter.get("/pipeline", canRead, controller.getPipeline);
dealRouter.get("/board", canRead, controller.getBoard);
dealRouter.get("/", canRead, validate({ query: listDealsQuerySchema }), controller.listDeals);
dealRouter.post("/", canManage, validate({ body: createDealSchema }), controller.createDeal);
dealRouter.get("/:id", canRead, validate({ params: dealIdParamSchema }), controller.getDeal);
dealRouter.patch(
  "/:id",
  canManage,
  validate({ params: dealIdParamSchema, body: updateDealSchema }),
  controller.updateDeal,
);
dealRouter.delete(
  "/:id",
  canManage,
  validate({ params: dealIdParamSchema }),
  controller.deleteDeal,
);
