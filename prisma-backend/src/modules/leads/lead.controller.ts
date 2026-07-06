import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListLeadsQuery } from "./lead.validation";
import { leadService } from "./lead.service";

export const listLeads = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListLeadsQuery>(req);
  const result = await leadService.listLeads(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getLead = asyncHandler(async (req, res) => {
  const lead = await leadService.getLeadById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, lead);
});

export const getLeadHistory = asyncHandler(async (req, res) => {
  const history = await leadService.getLeadHistory(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, history);
});

export const createLead = asyncHandler(async (req, res) => {
  const lead = await leadService.createLead(req.body, getAuthContext(req));
  return sendCreated(res, lead, "Lead created");
});

export const updateLead = asyncHandler(async (req, res) => {
  const lead = await leadService.updateLead(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, lead, "Lead updated");
});

export const qualifyLead = asyncHandler(async (req, res) => {
  const lead = await leadService.qualifyLead(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, lead, "Lead qualified");
});

export const disqualifyLead = asyncHandler(async (req, res) => {
  const lead = await leadService.disqualifyLead(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, lead, "Lead disqualified");
});

export const assignLead = asyncHandler(async (req, res) => {
  const lead = await leadService.assignLead(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, lead, "Lead assigned");
});

export const scoreLead = asyncHandler(async (req, res) => {
  const lead = await leadService.scoreLead(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, lead, "Lead scored");
});

export const convertLead = asyncHandler(async (req, res) => {
  const result = await leadService.convertLead(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, result, "Lead converted");
});

export const deleteLead = asyncHandler(async (req, res) => {
  await leadService.deleteLead(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Lead deleted");
});

export const importLeads = asyncHandler(async (req, res) => {
  const result = await leadService.importLeads(req.body, getAuthContext(req));
  return sendCreated(res, result, "Leads imported");
});

export const importLeadsCsv = asyncHandler(async (req, res) => {
  const result = await leadService.importLeadsCsv(req.body, getAuthContext(req));
  return sendCreated(res, result, "Leads imported from CSV");
});

export const exportLeads = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListLeadsQuery>(req);
  const result = await leadService.exportLeads(query, getAuthContext(req));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="leads.csv"');
  return res.status(200).send(result.csv);
});
