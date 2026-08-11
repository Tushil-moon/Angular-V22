import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./payment.controller";
import { listPaymentsQuerySchema, paymentIdParamSchema } from "./payment.validation";

export const paymentRouter = Router();

const canRead = requirePermission(Permissions.ReadPayments, Permissions.ManagePayments);

paymentRouter.use(authenticate);

paymentRouter.get("/", canRead, validate({ query: listPaymentsQuerySchema }), controller.listPayments);
paymentRouter.get("/:id", canRead, validate({ params: paymentIdParamSchema }), controller.getPayment);
