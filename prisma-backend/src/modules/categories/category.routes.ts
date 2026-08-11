import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./category.controller";
import {
  categoryIdParamSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from "./category.validation";

export const categoryRouter = Router();

const canRead = requirePermission(Permissions.ReadCategories, Permissions.ManageCategories);
const canManage = requirePermission(Permissions.ManageCategories);

categoryRouter.use(authenticate);

categoryRouter.get("/", canRead, validate({ query: listCategoriesQuerySchema }), controller.listCategories);
categoryRouter.get("/tree", canRead, controller.getCategoryTree);
categoryRouter.post("/", canManage, validate({ body: createCategorySchema }), controller.createCategory);
categoryRouter.get("/:id", canRead, validate({ params: categoryIdParamSchema }), controller.getCategory);
categoryRouter.patch(
  "/:id",
  canManage,
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  controller.updateCategory,
);
categoryRouter.delete(
  "/:id",
  canManage,
  validate({ params: categoryIdParamSchema }),
  controller.deleteCategory,
);
