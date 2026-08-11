import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./supplier.controller";
import {
  createSupplierSchema,
  listSuppliersQuerySchema,
  supplierIdParamSchema,
  updateSupplierSchema,
} from "./supplier.validation";

export const supplierRouter = Router();

const canRead = requirePermission(Permissions.ReadSuppliers, Permissions.ManageSuppliers);
const canManage = requirePermission(Permissions.ManageSuppliers);

supplierRouter.use(authenticate);

supplierRouter.get("/", canRead, validate({ query: listSuppliersQuerySchema }), controller.listSuppliers);
supplierRouter.post("/", canManage, validate({ body: createSupplierSchema }), controller.createSupplier);
supplierRouter.get("/:id", canRead, validate({ params: supplierIdParamSchema }), controller.getSupplier);
supplierRouter.patch(
  "/:id",
  canManage,
  validate({ params: supplierIdParamSchema, body: updateSupplierSchema }),
  controller.updateSupplier,
);
supplierRouter.delete(
  "/:id",
  canManage,
  validate({ params: supplierIdParamSchema }),
  controller.deleteSupplier,
);
