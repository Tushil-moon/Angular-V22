import { asyncHandler } from "../../shared/utils/async-handler";
import { sendSuccess } from "../../shared/utils/response";
import { dashboardService } from "./dashboard.service";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getStats(req.user!.id, req.user!.roles);
  return sendSuccess(res, stats);
});
