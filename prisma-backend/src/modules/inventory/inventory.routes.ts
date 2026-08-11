import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./inventory.controller";
import {
  adjustInventorySchema,
  inventoryIdParamSchema,
  listInventoryQuerySchema,
  listMovementsQuerySchema,
} from "./inventory.validation";

export const inventoryRouter = Router();

const canRead = requirePermission(Permissions.ReadInventory, Permissions.ManageInventory);
const canManage = requirePermission(Permissions.ManageInventory);

inventoryRouter.use(authenticate);

inventoryRouter.get("/", canRead, validate({ query: listInventoryQuerySchema }), controller.listInventory);
inventoryRouter.get("/low-stock", canRead, validate({ query: listInventoryQuerySchema }), controller.listLowStock);
inventoryRouter.get(
  "/out-of-stock",
  canRead,
  validate({ query: listInventoryQuerySchema }),
  controller.listOutOfStock,
);
inventoryRouter.get(
  "/movements",
  canRead,
  validate({ query: listMovementsQuerySchema }),
  controller.listMovements,
);
inventoryRouter.post("/adjust", canManage, validate({ body: adjustInventorySchema }), controller.adjustInventory);
inventoryRouter.get(
  "/:id",
  canRead,
  validate({ params: inventoryIdParamSchema }),
  controller.getInventoryItem,
);
