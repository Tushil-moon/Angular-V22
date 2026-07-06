import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./deal.controller";
import {
  boardQuerySchema,
  createDealSchema,
  dealIdParamSchema,
  importDealsCsvSchema,
  importDealsSchema,
  listDealsQuerySchema,
  loseDealSchema,
  reopenDealSchema,
  updateDealSchema,
  winDealSchema,
} from "./deal.validation";

export const dealRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

dealRouter.use(authenticate, resolveOrganization);

dealRouter.get("/pipeline", canRead, validate({ query: boardQuerySchema }), controller.getPipeline);
dealRouter.get("/board", canRead, validate({ query: boardQuerySchema }), controller.getBoard);
dealRouter.get("/export", canRead, validate({ query: listDealsQuerySchema }), controller.exportDeals);
dealRouter.post("/import", canManage, validate({ body: importDealsSchema }), controller.importDeals);
dealRouter.post("/import/csv", canManage, validate({ body: importDealsCsvSchema }), controller.importDealsCsv);
dealRouter.get("/", canRead, validate({ query: listDealsQuerySchema }), controller.listDeals);
dealRouter.post("/", canManage, validate({ body: createDealSchema }), controller.createDeal);
dealRouter.get("/:id", canRead, validate({ params: dealIdParamSchema }), controller.getDeal);
dealRouter.get(
  "/:id/history",
  canRead,
  validate({ params: dealIdParamSchema }),
  controller.getDealHistory,
);
dealRouter.patch(
  "/:id",
  canManage,
  validate({ params: dealIdParamSchema, body: updateDealSchema }),
  controller.updateDeal,
);
dealRouter.post(
  "/:id/win",
  canManage,
  validate({ params: dealIdParamSchema, body: winDealSchema }),
  controller.winDeal,
);
dealRouter.post(
  "/:id/lose",
  canManage,
  validate({ params: dealIdParamSchema, body: loseDealSchema }),
  controller.loseDeal,
);
dealRouter.post(
  "/:id/reopen",
  canManage,
  validate({ params: dealIdParamSchema, body: reopenDealSchema }),
  controller.reopenDeal,
);
dealRouter.delete(
  "/:id",
  canManage,
  validate({ params: dealIdParamSchema }),
  controller.deleteDeal,
);
