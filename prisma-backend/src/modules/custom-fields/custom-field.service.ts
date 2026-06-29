import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import type { CreateCustomFieldInput, ListCustomFieldsQuery, UpdateCustomFieldInput } from "./custom-field.validation";

export const customFieldService = {
  async listFields(query: ListCustomFieldsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const where = {
      organizationId,
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await prisma.$transaction([
      prisma.customFieldDefinition.findMany({ where, orderBy: { entityType: "asc" }, skip, take: query.pageSize }),
      prisma.customFieldDefinition.count({ where }),
    ]);
    return { data, ...buildPaginationMeta(total, query.page, query.pageSize) };
  },

  async getFieldById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const item = await prisma.customFieldDefinition.findFirst({ where: { id, organizationId } });
    if (!item) throw new AppError(404, "Custom field not found", "CUSTOM_FIELD_NOT_FOUND");
    return item;
  },

  async createField(input: CreateCustomFieldInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    try {
      return await prisma.customFieldDefinition.create({ data: { ...input, organizationId } });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        throw new AppError(409, "Custom field already exists", "CUSTOM_FIELD_EXISTS");
      }
      throw error;
    }
  },

  async updateField(id: string, input: UpdateCustomFieldInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.customFieldDefinition.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Custom field not found", "CUSTOM_FIELD_NOT_FOUND");
    return prisma.customFieldDefinition.update({ where: { id }, data: input });
  },

  async deleteField(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.customFieldDefinition.findFirst({ where: { id, organizationId } });
    if (!existing) throw new AppError(404, "Custom field not found", "CUSTOM_FIELD_NOT_FOUND");
    await prisma.customFieldDefinition.delete({ where: { id } });
  },
};
