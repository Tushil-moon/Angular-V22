import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { mapTag } from "../../shared/utils/crm-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { normalizeTagName } from "../../shared/utils/tag-sync";
import type { CreateTagInput, ListTagsQuery } from "./tag.validation";

export const tagService = {
  async listTags(query: ListTagsQuery, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const search = query.search?.trim() ?? "";
    const tags = await prisma.tag.findMany({
      where: {
        organizationId,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { name: "asc" },
      take: 100,
    });

    return tags.map(mapTag);
  },

  async createTag(input: CreateTagInput, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const name = normalizeTagName(input.name);
    try {
      const tag = await prisma.tag.create({
        data: { organizationId, name, color: input.color ?? "#6366f1" },
      });
      return mapTag(tag);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        throw new AppError(409, "Tag already exists", "TAG_EXISTS");
      }
      throw error;
    }
  },
};
