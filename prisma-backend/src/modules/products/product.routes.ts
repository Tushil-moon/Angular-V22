import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./product.controller";
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
} from "./product.validation";

export const productRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

productRouter.use(authenticate, resolveOrganization);

productRouter.get("/", canRead, validate({ query: listProductsQuerySchema }), controller.listProducts);
productRouter.post("/", canManage, validate({ body: createProductSchema }), controller.createProduct);
productRouter.get("/:id", canRead, validate({ params: productIdParamSchema }), controller.getProduct);
productRouter.patch(
  "/:id",
  canManage,
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  controller.updateProduct,
);
productRouter.delete("/:id", canManage, validate({ params: productIdParamSchema }), controller.deleteProduct);
