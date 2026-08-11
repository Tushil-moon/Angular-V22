import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./purchase-order.controller";
import {
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  purchaseOrderIdParamSchema,
  updatePurchaseOrderSchema,
} from "./purchase-order.validation";

export const purchaseOrderRouter = Router();

const canRead = requirePermission(Permissions.ReadPurchaseOrders, Permissions.ManagePurchaseOrders);
const canManage = requirePermission(Permissions.ManagePurchaseOrders);

purchaseOrderRouter.use(authenticate);

purchaseOrderRouter.get(
  "/",
  canRead,
  validate({ query: listPurchaseOrdersQuerySchema }),
  controller.listPurchaseOrders,
);
purchaseOrderRouter.post(
  "/",
  canManage,
  validate({ body: createPurchaseOrderSchema }),
  controller.createPurchaseOrder,
);
purchaseOrderRouter.get(
  "/:id",
  canRead,
  validate({ params: purchaseOrderIdParamSchema }),
  controller.getPurchaseOrder,
);
purchaseOrderRouter.patch(
  "/:id",
  canManage,
  validate({ params: purchaseOrderIdParamSchema, body: updatePurchaseOrderSchema }),
  controller.updatePurchaseOrder,
);
purchaseOrderRouter.delete(
  "/:id",
  canManage,
  validate({ params: purchaseOrderIdParamSchema }),
  controller.deletePurchaseOrder,
);
