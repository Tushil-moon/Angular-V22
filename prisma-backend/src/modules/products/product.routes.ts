import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./product.controller";
import {
  createProductSchema,
  createVariantSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
  updateVariantSchema,
  variantIdParamSchema,
} from "./product.validation";

export const productRouter = Router();

const canRead = requirePermission(Permissions.ReadProducts, Permissions.ManageProducts);
const canManage = requirePermission(Permissions.ManageProducts);

productRouter.use(authenticate);

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
productRouter.post(
  "/:id/publish",
  canManage,
  validate({ params: productIdParamSchema }),
  controller.publishProduct,
);
productRouter.post(
  "/:id/archive",
  canManage,
  validate({ params: productIdParamSchema }),
  controller.archiveProduct,
);
productRouter.post(
  "/:id/duplicate",
  canManage,
  validate({ params: productIdParamSchema }),
  controller.duplicateProduct,
);
productRouter.get(
  "/:id/variants",
  canRead,
  validate({ params: productIdParamSchema }),
  controller.listVariants,
);
productRouter.post(
  "/:id/variants",
  canManage,
  validate({ params: productIdParamSchema, body: createVariantSchema }),
  controller.createVariant,
);
productRouter.patch(
  "/:id/variants/:variantId",
  canManage,
  validate({ params: variantIdParamSchema, body: updateVariantSchema }),
  controller.updateVariant,
);
productRouter.delete(
  "/:id/variants/:variantId",
  canManage,
  validate({ params: variantIdParamSchema }),
  controller.deleteVariant,
);
