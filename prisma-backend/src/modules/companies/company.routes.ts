import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./company.controller";
import {
  checkCompanyDuplicatesSchema,
  companyIdParamSchema,
  createCompanySchema,
  importCompaniesCsvSchema,
  importCompaniesSchema,
  listCompaniesQuerySchema,
  updateCompanySchema,
} from "./company.validation";

export const companyRouter = Router();

const canRead = requirePermission(Permissions.ReadCompanies);
const canManage = requirePermission(Permissions.ManageCompanies);

companyRouter.use(authenticate, resolveOrganization);

companyRouter.get("/", canRead, validate({ query: listCompaniesQuerySchema }), controller.listCompanies);
companyRouter.get("/tree", canRead, controller.getCompanyTree);
companyRouter.get("/export", canRead, validate({ query: listCompaniesQuerySchema }), controller.exportCompanies);
companyRouter.post(
  "/check-duplicates",
  canRead,
  validate({ body: checkCompanyDuplicatesSchema }),
  controller.checkDuplicates,
);
companyRouter.post("/import", canManage, validate({ body: importCompaniesSchema }), controller.importCompanies);
companyRouter.post(
  "/import/csv",
  canManage,
  validate({ body: importCompaniesCsvSchema }),
  controller.importCompaniesCsv,
);
companyRouter.post("/", canManage, validate({ body: createCompanySchema }), controller.createCompany);
companyRouter.get("/:id", canRead, validate({ params: companyIdParamSchema }), controller.getCompany);
companyRouter.patch(
  "/:id",
  canManage,
  validate({ params: companyIdParamSchema, body: updateCompanySchema }),
  controller.updateCompany,
);
companyRouter.delete(
  "/:id",
  canManage,
  validate({ params: companyIdParamSchema }),
  controller.deleteCompany,
);
