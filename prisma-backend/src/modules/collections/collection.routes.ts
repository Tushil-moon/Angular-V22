import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./collection.controller";
import {
  collectionIdParamSchema,
  createCollectionSchema,
  listCollectionsQuerySchema,
  updateCollectionSchema,
} from "./collection.validation";

export const collectionRouter = Router();

const canRead = requirePermission(Permissions.ReadCollections, Permissions.ManageCollections);
const canManage = requirePermission(Permissions.ManageCollections);

collectionRouter.use(authenticate);

collectionRouter.get("/", canRead, validate({ query: listCollectionsQuerySchema }), controller.listCollections);
collectionRouter.post("/", canManage, validate({ body: createCollectionSchema }), controller.createCollection);
collectionRouter.get("/:id", canRead, validate({ params: collectionIdParamSchema }), controller.getCollection);
collectionRouter.patch(
  "/:id",
  canManage,
  validate({ params: collectionIdParamSchema, body: updateCollectionSchema }),
  controller.updateCollection,
);
collectionRouter.delete(
  "/:id",
  canManage,
  validate({ params: collectionIdParamSchema }),
  controller.deleteCollection,
);
