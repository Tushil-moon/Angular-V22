import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./coupon.controller";
import {
  couponIdParamSchema,
  createCouponSchema,
  listCouponsQuerySchema,
  updateCouponSchema,
} from "./coupon.validation";

export const couponRouter = Router();

const canRead = requirePermission(Permissions.ReadCoupons, Permissions.ManageCoupons);
const canManage = requirePermission(Permissions.ManageCoupons);

couponRouter.use(authenticate);

couponRouter.get("/", canRead, validate({ query: listCouponsQuerySchema }), controller.listCoupons);
couponRouter.post("/", canManage, validate({ body: createCouponSchema }), controller.createCoupon);
couponRouter.get("/:id", canRead, validate({ params: couponIdParamSchema }), controller.getCoupon);
couponRouter.patch(
  "/:id",
  canManage,
  validate({ params: couponIdParamSchema, body: updateCouponSchema }),
  controller.updateCoupon,
);
couponRouter.delete("/:id", canManage, validate({ params: couponIdParamSchema }), controller.deleteCoupon);
