import { AppError } from "../../shared/errors/app-error";
import { mapEmailTemplate } from "../../shared/utils/marketing-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { emailTemplateRepository } from "./email-template.repository";
import { buildEmailTemplateListWhere } from "./email-template.utils";
import type {
  CreateEmailTemplateInput,
  ListEmailTemplatesQuery,
  UpdateEmailTemplateInput,
} from "./email-template.validation";

export const emailTemplateService = {
  async listTemplates(query: ListEmailTemplatesQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = buildEmailTemplateListWhere(query, organizationId);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await Promise.all([
      emailTemplateRepository.findMany(where, skip, query.pageSize),
      emailTemplateRepository.count(where),
    ]);
    return { data: data.map(mapEmailTemplate), ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getTemplateById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await emailTemplateRepository.findById({ id, organizationId });
    if (!item) throw new AppError(404, "Email template not found", "EMAIL_TEMPLATE_NOT_FOUND");
    return mapEmailTemplate(item);
  },

  async createTemplate(input: CreateEmailTemplateInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await emailTemplateRepository.create({
      organization: { connect: { id: organizationId } },
      name: input.name,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      category: input.category,
      previewText: input.previewText,
      active: input.active ?? true,
    });
    return mapEmailTemplate(item);
  },

  async updateTemplate(id: string, input: UpdateEmailTemplateInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await emailTemplateRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Email template not found", "EMAIL_TEMPLATE_NOT_FOUND");
    const item = await emailTemplateRepository.update(id, {
      name: input.name,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      category: input.category === null ? null : input.category,
      previewText: input.previewText === null ? null : input.previewText,
      active: input.active,
    });
    return mapEmailTemplate(item);
  },

  async deleteTemplate(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await emailTemplateRepository.findById({ id, organizationId });
    if (!existing) throw new AppError(404, "Email template not found", "EMAIL_TEMPLATE_NOT_FOUND");
    await emailTemplateRepository.delete(id);
  },
};
