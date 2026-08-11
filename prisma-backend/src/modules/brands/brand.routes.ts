import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./brand.controller";
import {
  brandIdParamSchema,
  createBrandSchema,
  listBrandsQuerySchema,
  updateBrandSchema,
} from "./brand.validation";

export const brandRouter = Router();

const canRead = requirePermission(Permissions.ReadBrands, Permissions.ManageBrands);
const canManage = requirePermission(Permissions.ManageBrands);

brandRouter.use(authenticate);

brandRouter.get("/", canRead, validate({ query: listBrandsQuerySchema }), controller.listBrands);
brandRouter.post("/", canManage, validate({ body: createBrandSchema }), controller.createBrand);
brandRouter.get("/:id", canRead, validate({ params: brandIdParamSchema }), controller.getBrand);
brandRouter.patch(
  "/:id",
  canManage,
  validate({ params: brandIdParamSchema, body: updateBrandSchema }),
  controller.updateBrand,
);
brandRouter.delete("/:id", canManage, validate({ params: brandIdParamSchema }), controller.deleteBrand);
