import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListEmailTemplatesQuery } from "./email-template.validation";
import { emailTemplateService } from "./email-template.service";

export const listTemplates = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListEmailTemplatesQuery>(req);
  const result = await emailTemplateService.listTemplates(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getTemplate = asyncHandler(async (req, res) => {
  const item = await emailTemplateService.getTemplateById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createTemplate = asyncHandler(async (req, res) => {
  const item = await emailTemplateService.createTemplate(req.body, getAuthContext(req));
  return sendCreated(res, item, "Email template created");
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const item = await emailTemplateService.updateTemplate(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Email template updated");
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  await emailTemplateService.deleteTemplate(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Email template deleted");
});
