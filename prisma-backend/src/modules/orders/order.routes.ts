import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./order.controller";
import {
  createOrderSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
} from "./order.validation";

export const orderRouter = Router();

const canRead = requirePermission(Permissions.ReadOrders, Permissions.ManageOrders);
const canManage = requirePermission(Permissions.ManageOrders);
const canCancel = requirePermission(Permissions.CancelOrders, Permissions.ManageOrders);

orderRouter.use(authenticate);

orderRouter.get("/", canRead, validate({ query: listOrdersQuerySchema }), controller.listOrders);
orderRouter.post("/", canManage, validate({ body: createOrderSchema }), controller.createOrder);
orderRouter.get("/:id", canRead, validate({ params: orderIdParamSchema }), controller.getOrder);
orderRouter.get(
  "/:id/timeline",
  canRead,
  validate({ params: orderIdParamSchema }),
  controller.getOrderTimeline,
);
orderRouter.post(
  "/:id/confirm",
  canManage,
  validate({ params: orderIdParamSchema }),
  controller.confirmOrder,
);
orderRouter.post(
  "/:id/cancel",
  canCancel,
  validate({ params: orderIdParamSchema }),
  controller.cancelOrder,
);
orderRouter.post(
  "/:id/ship",
  canManage,
  validate({ params: orderIdParamSchema }),
  controller.shipOrder,
);
orderRouter.post(
  "/:id/complete",
  canManage,
  validate({ params: orderIdParamSchema }),
  controller.completeOrder,
);
