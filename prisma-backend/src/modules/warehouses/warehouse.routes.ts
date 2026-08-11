import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./warehouse.controller";
import {
  createWarehouseSchema,
  listWarehousesQuerySchema,
  updateWarehouseSchema,
  warehouseIdParamSchema,
} from "./warehouse.validation";

export const warehouseRouter = Router();

const canRead = requirePermission(Permissions.ReadWarehouses, Permissions.ManageWarehouses);
const canManage = requirePermission(Permissions.ManageWarehouses);

warehouseRouter.use(authenticate);

warehouseRouter.get("/", canRead, validate({ query: listWarehousesQuerySchema }), controller.listWarehouses);
warehouseRouter.post("/", canManage, validate({ body: createWarehouseSchema }), controller.createWarehouse);
warehouseRouter.get("/:id", canRead, validate({ params: warehouseIdParamSchema }), controller.getWarehouse);
warehouseRouter.patch(
  "/:id",
  canManage,
  validate({ params: warehouseIdParamSchema, body: updateWarehouseSchema }),
  controller.updateWarehouse,
);
warehouseRouter.delete(
  "/:id",
  canManage,
  validate({ params: warehouseIdParamSchema }),
  controller.deleteWarehouse,
);
