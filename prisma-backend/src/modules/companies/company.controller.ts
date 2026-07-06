import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCompaniesQuery } from "./company.validation";
import { companyService } from "./company.service";

export const listCompanies = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCompaniesQuery>(req);
  const result = await companyService.listCompanies(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getCompanyTree = asyncHandler(async (req, res) => {
  const tree = await companyService.getCompanyTree(getAuthContext(req));
  return sendSuccess(res, tree);
});

export const getCompany = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, company);
});

export const createCompany = asyncHandler(async (req, res) => {
  const company = await companyService.createCompany(req.body, getAuthContext(req));
  return sendCreated(res, company, "Company created");
});

export const updateCompany = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompany(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, company, "Company updated");
});

export const deleteCompany = asyncHandler(async (req, res) => {
  await companyService.deleteCompany(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Company deleted");
});

export const checkDuplicates = asyncHandler(async (req, res) => {
  const matches = await companyService.checkDuplicates(req.body, getAuthContext(req));
  return sendSuccess(res, matches);
});

export const importCompanies = asyncHandler(async (req, res) => {
  const result = await companyService.importCompanies(req.body, getAuthContext(req));
  return sendCreated(res, result, "Companies imported");
});

export const importCompaniesCsv = asyncHandler(async (req, res) => {
  const result = await companyService.importCompaniesCsv(req.body, getAuthContext(req));
  return sendCreated(res, result, "Companies imported from CSV");
});

export const exportCompanies = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCompaniesQuery>(req);
  const result = await companyService.exportCompanies(query, getAuthContext(req));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="companies.csv"');
  return res.status(200).send(result.csv);
});
