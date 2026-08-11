import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendSuccess } from "../../shared/utils/response";
import type { ListReviewsQuery } from "./review.validation";
import { reviewService } from "./review.service";

export const listReviews = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListReviewsQuery>(req);
  const result = await reviewService.list(query);
  return sendSuccess(res, result);
});

export const getReview = asyncHandler(async (req, res) => {
  const review = await reviewService.getById(String(req.params.id));
  return sendSuccess(res, review);
});

export const updateReview = asyncHandler(async (req, res) => {
  const review = await reviewService.update(String(req.params.id), req.body);
  return sendSuccess(res, review, "Review updated");
});
