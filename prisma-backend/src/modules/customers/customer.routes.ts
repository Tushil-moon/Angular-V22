import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./customer.controller";
import {
  createCustomerSchema,
  customerIdParamSchema,
  listCustomerOrdersQuerySchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "./customer.validation";

export const customerRouter = Router();

const canRead = requirePermission(Permissions.ReadCustomers, Permissions.ManageCustomers);
const canManage = requirePermission(Permissions.ManageCustomers);

customerRouter.use(authenticate);

customerRouter.get("/", canRead, validate({ query: listCustomersQuerySchema }), controller.listCustomers);
customerRouter.post("/", canManage, validate({ body: createCustomerSchema }), controller.createCustomer);
customerRouter.get(
  "/:id/orders",
  canRead,
  validate({ params: customerIdParamSchema, query: listCustomerOrdersQuerySchema }),
  controller.listCustomerOrders,
);
customerRouter.get("/:id", canRead, validate({ params: customerIdParamSchema }), controller.getCustomer);
customerRouter.patch(
  "/:id",
  canManage,
  validate({ params: customerIdParamSchema, body: updateCustomerSchema }),
  controller.updateCustomer,
);
customerRouter.delete(
  "/:id",
  canManage,
  validate({ params: customerIdParamSchema }),
  controller.deleteCustomer,
);
