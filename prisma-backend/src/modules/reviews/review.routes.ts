import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./review.controller";
import {
  listReviewsQuerySchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from "./review.validation";

export const reviewRouter = Router();

const canRead = requirePermission(Permissions.ReadReviews, Permissions.ManageReviews);
const canManage = requirePermission(Permissions.ManageReviews);

reviewRouter.use(authenticate);

reviewRouter.get("/", canRead, validate({ query: listReviewsQuerySchema }), controller.listReviews);
reviewRouter.get("/:id", canRead, validate({ params: reviewIdParamSchema }), controller.getReview);
reviewRouter.patch(
  "/:id",
  canManage,
  validate({ params: reviewIdParamSchema, body: updateReviewSchema }),
  controller.updateReview,
);
