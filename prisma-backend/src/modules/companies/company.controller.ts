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
