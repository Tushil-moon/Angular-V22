import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./refund.controller";
import {
  createRefundSchema,
  listRefundsQuerySchema,
  refundIdParamSchema,
  updateRefundSchema,
} from "./refund.validation";

export const refundRouter = Router();

const canRead = requirePermission(Permissions.ReadRefunds, Permissions.ManageRefunds);
const canManage = requirePermission(Permissions.ManageRefunds);

refundRouter.use(authenticate);

refundRouter.get("/", canRead, validate({ query: listRefundsQuerySchema }), controller.listRefunds);
refundRouter.post("/", canManage, validate({ body: createRefundSchema }), controller.createRefund);
refundRouter.get("/:id", canRead, validate({ params: refundIdParamSchema }), controller.getRefund);
refundRouter.patch(
  "/:id",
  canManage,
  validate({ params: refundIdParamSchema, body: updateRefundSchema }),
  controller.updateRefund,
);
