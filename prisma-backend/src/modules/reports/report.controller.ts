import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListReportsQuery } from "./report.validation";
import { reportService } from "./report.service";

export const listReports = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListReportsQuery>(req);
  const result = await reportService.list(query);
  return sendSuccess(res, result);
});

export const getReport = asyncHandler(async (req, res) => {
  const job = await reportService.getById(String(req.params.id));
  return sendSuccess(res, job);
});

export const createReport = asyncHandler(async (req, res) => {
  const job = await reportService.create(req.body, req.user?.id);
  return sendCreated(res, job, "Report job created");
});
