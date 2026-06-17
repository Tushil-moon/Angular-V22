import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import type { CreateSavedViewInput, ListSavedViewsQuery, UpdateSavedViewInput } from "./saved-view.validation";

const mapSavedView = (view: {
  id: string;
  userId: string;
  entityType: string;
  name: string;
  filters: unknown;
  sort: unknown;
  columns: unknown;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: view.id,
  userId: view.userId,
  entityType: view.entityType,
  name: view.name,
  filters: view.filters,
  sort: view.sort,
  columns: view.columns,
  isDefault: view.isDefault,
  createdAt: view.createdAt,
  updatedAt: view.updatedAt,
});

export const savedViewService = {
  async listSavedViews(auth: AuthContext, query: ListSavedViewsQuery) {
    const organizationId = requireOrganizationContext(auth);
    const views = await prisma.savedView.findMany({
      where: { organizationId, userId: auth.userId, entityType: query.entityType },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return views.map(mapSavedView);
  },

  async createSavedView(auth: AuthContext, input: CreateSavedViewInput) {
    const organizationId = requireOrganizationContext(auth);

    if (input.isDefault) {
      await prisma.savedView.updateMany({
        where: { organizationId, userId: auth.userId, entityType: input.entityType },
        data: { isDefault: false },
      });
    }

    const view = await prisma.savedView.create({
      data: {
        organizationId,
        userId: auth.userId,
        entityType: input.entityType,
        name: input.name.trim(),
        filters: input.filters as object,
        sort: input.sort as object | undefined,
        columns: input.columns as object | undefined,
        isDefault: input.isDefault ?? false,
      },
    });

    return mapSavedView(view);
  },

  async updateSavedView(id: string, auth: AuthContext, input: UpdateSavedViewInput) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.savedView.findFirst({
      where: { id, userId: auth.userId, organizationId },
    });
    if (!existing) throw new AppError(404, "Saved view not found", "SAVED_VIEW_NOT_FOUND");

    if (input.isDefault) {
      await prisma.savedView.updateMany({
        where: { organizationId, userId: auth.userId, entityType: existing.entityType },
        data: { isDefault: false },
      });
    }

    const view = await prisma.savedView.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        filters: input.filters as object | undefined,
        sort: input.sort as object | undefined,
        columns: input.columns as object | undefined,
        isDefault: input.isDefault,
      },
    });

    return mapSavedView(view);
  },

  async deleteSavedView(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const existing = await prisma.savedView.findFirst({
      where: { id, userId: auth.userId, organizationId },
    });
    if (!existing) throw new AppError(404, "Saved view not found", "SAVED_VIEW_NOT_FOUND");
    await prisma.savedView.delete({ where: { id } });
  },
};
