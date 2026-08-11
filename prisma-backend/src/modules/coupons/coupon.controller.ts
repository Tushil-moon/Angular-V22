import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCouponsQuery } from "./coupon.validation";
import { couponService } from "./coupon.service";

export const listCoupons = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCouponsQuery>(req);
  const result = await couponService.list(query);
  return sendSuccess(res, result);
});

export const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.getById(String(req.params.id));
  return sendSuccess(res, coupon);
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.create(req.body);
  return sendCreated(res, coupon, "Coupon created");
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.update(String(req.params.id), req.body);
  return sendSuccess(res, coupon, "Coupon updated");
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  await couponService.remove(String(req.params.id));
  return sendSuccess(res, null, "Coupon deleted");
});
