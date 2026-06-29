import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListDashboardLayoutsQuery, ListReportsQuery } from "./report.validation";
import { reportService } from "./report.service";

export const listReports = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListReportsQuery>(req);
  const result = await reportService.listReports(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getReport = asyncHandler(async (req, res) => {
  const item = await reportService.getReportById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createReport = asyncHandler(async (req, res) => {
  const item = await reportService.createReport(req.body, getAuthContext(req));
  return sendCreated(res, item, "Report created");
});

export const updateReport = asyncHandler(async (req, res) => {
  const item = await reportService.updateReport(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Report updated");
});

export const deleteReport = asyncHandler(async (req, res) => {
  await reportService.deleteReport(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Report deleted");
});

export const listDashboardLayouts = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListDashboardLayoutsQuery>(req);
  const result = await reportService.listDashboardLayouts(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getDashboardLayout = asyncHandler(async (req, res) => {
  const item = await reportService.getDashboardLayoutById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createDashboardLayout = asyncHandler(async (req, res) => {
  const item = await reportService.createDashboardLayout(req.body, getAuthContext(req));
  return sendCreated(res, item, "Dashboard layout created");
});

export const updateDashboardLayout = asyncHandler(async (req, res) => {
  const item = await reportService.updateDashboardLayout(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Dashboard layout updated");
});

export const deleteDashboardLayout = asyncHandler(async (req, res) => {
  await reportService.deleteDashboardLayout(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Dashboard layout deleted");
});
