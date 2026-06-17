import { asyncHandler } from "../../shared/utils/async-handler";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendSuccess } from "../../shared/utils/response";
import { dashboardService } from "./dashboard.service";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getStats(getAuthContext(req));
  return sendSuccess(res, stats);
});
