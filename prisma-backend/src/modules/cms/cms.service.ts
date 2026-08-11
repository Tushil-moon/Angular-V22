import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { buildPaginationMeta } from "../../shared/validation/pagination";
import { getDefaultStoreId } from "../../shared/utils/store";
import type {
  CreateCmsBannerInput,
  CreateCmsMenuInput,
  CreateCmsPageInput,
  ListCmsBannersQuery,
  ListCmsMenusQuery,
  ListCmsPagesQuery,
  UpdateCmsBannerInput,
  UpdateCmsMenuInput,
  UpdateCmsPageInput,
} from "./cms.validation";

const pageSelect = {
  id: true,
  storeId: true,
  title: true,
  slug: true,
  body: true,
  status: true,
  metaTitle: true,
  metaDescription: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CmsPageSelect;

const bannerSelect = {
  id: true,
  storeId: true,
  title: true,
  subtitle: true,
  imageUrl: true,
  linkUrl: true,
  position: true,
  sortOrder: true,
  startsAt: true,
  endsAt: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CmsBannerSelect;

const menuSelect = {
  id: true,
  storeId: true,
  name: true,
  handle: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CmsMenuSelect;

export const cmsService = {
  async listPages(query: ListCmsPagesQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsPageWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.CmsPageOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      title: { title: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.cmsPage.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "created_at"] ?? { createdAt: "desc" },
        select: pageSelect,
      }),
      prisma.cmsPage.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getPageById(id: string) {
    const storeId = await getDefaultStoreId();
    const page = await prisma.cmsPage.findFirst({
      where: { id, storeId, deletedAt: null },
      select: pageSelect,
    });
    if (!page) throw new AppError(404, "CMS page not found", "CMS_PAGE_NOT_FOUND");
    return page;
  },

  async createPage(input: CreateCmsPageInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.cmsPage.findFirst({
      where: { storeId, slug: input.slug, deletedAt: null },
    });
    if (existing) throw new AppError(409, "CMS page slug already exists", "CMS_PAGE_SLUG_EXISTS");

    const status = input.status ?? "DRAFT";
    return prisma.cmsPage.create({
      data: {
        storeId,
        title: input.title,
        slug: input.slug,
        body: input.body ?? null,
        status,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        publishedAt:
          input.publishedAt ?? (status === "PUBLISHED" ? new Date() : null),
      },
      select: pageSelect,
    });
  },

  async updatePage(id: string, input: UpdateCmsPageInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.cmsPage.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "CMS page not found", "CMS_PAGE_NOT_FOUND");

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await prisma.cmsPage.findFirst({
        where: { storeId, slug: input.slug, deletedAt: null, NOT: { id } },
      });
      if (slugTaken) throw new AppError(409, "CMS page slug already exists", "CMS_PAGE_SLUG_EXISTS");
    }

    let publishedAt = input.publishedAt;
    if (publishedAt === undefined && input.status === "PUBLISHED" && !existing.publishedAt) {
      publishedAt = new Date();
    }

    return prisma.cmsPage.update({
      where: { id },
      data: {
        title: input.title,
        slug: input.slug,
        body: input.body === undefined ? undefined : input.body,
        status: input.status,
        metaTitle: input.metaTitle === undefined ? undefined : input.metaTitle,
        metaDescription: input.metaDescription === undefined ? undefined : input.metaDescription,
        publishedAt: publishedAt === undefined ? undefined : publishedAt,
      },
      select: pageSelect,
    });
  },

  async removePage(id: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.cmsPage.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "CMS page not found", "CMS_PAGE_NOT_FOUND");

    await prisma.cmsPage.update({
      where: { id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  },

  async listBanners(query: ListCmsBannersQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CmsBannerWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { subtitle: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const sortMap: Record<string, Prisma.CmsBannerOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      sort_order: { sortOrder: query.order },
      title: { title: query.order },
    };

    const [items, total] = await prisma.$transaction([
      prisma.cmsBanner.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "sort_order"] ?? { sortOrder: "asc" },
        select: bannerSelect,
      }),
      prisma.cmsBanner.count({ where }),
    ]);

    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async createBanner(input: CreateCmsBannerInput) {
    const storeId = await getDefaultStoreId();
    return prisma.cmsBanner.create({
      data: {
        storeId,
        title: input.title,
        subtitle: input.subtitle ?? null,
        imageUrl: input.imageUrl || null,
        linkUrl: input.linkUrl || null,
        position: input.position ?? null,
        sortOrder: input.sortOrder ?? 0,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        enabled: input.enabled ?? true,
      },
      select: bannerSelect,
    });
  },

  async updateBanner(id: string, input: UpdateCmsBannerInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.cmsBanner.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "CMS banner not found", "CMS_BANNER_NOT_FOUND");

    return prisma.cmsBanner.update({
      where: { id },
      data: {
        title: input.title,
        subtitle: input.subtitle === undefined ? undefined : input.subtitle,
        imageUrl: input.imageUrl === undefined ? undefined : input.imageUrl || null,
        linkUrl: input.linkUrl === undefined ? undefined : input.linkUrl || null,
        position: input.position === undefined ? undefined : input.position,
        sortOrder: input.sortOrder,
        startsAt: input.startsAt === undefined ? undefined : input.startsAt,
        endsAt: input.endsAt === undefined ? undefined : input.endsAt,
        enabled: input.enabled,
      },
      select: bannerSelect,
    });
  },

  async removeBanner(id: string) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.cmsBanner.findFirst({
      where: { id, storeId, deletedAt: null },
    });
    if (!existing) throw new AppError(404, "CMS banner not found", "CMS_BANNER_NOT_FOUND");

    await prisma.cmsBanner.update({
      where: { id },
      data: { deletedAt: new Date(), enabled: false },
    });
  },

  async listMenus(query: ListCmsMenusQuery) {
    const storeId = await getDefaultStoreId();
    const page = query.page;
    const pageSize = query.pageSize;
    const skip = (page - 1) * pageSize;
    const where: Prisma.CmsMenuWhereInput = {
      storeId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { handle: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const sortMap: Record<string, Prisma.CmsMenuOrderByWithRelationInput> = {
      created_at: { createdAt: query.order },
      updated_at: { updatedAt: query.order },
      name: { name: query.order },
    };
    const [items, total] = await prisma.$transaction([
      prisma.cmsMenu.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: sortMap[query.sort ?? "name"] ?? { name: "asc" },
        select: menuSelect,
      }),
      prisma.cmsMenu.count({ where }),
    ]);
    return { data: items, ...buildPaginationMeta(total, page, pageSize) };
  },

  async getMenuById(id: string) {
    const storeId = await getDefaultStoreId();
    const menu = await prisma.cmsMenu.findFirst({
      where: { id, storeId, deletedAt: null },
      select: menuSelect,
    });
    if (!menu) throw new AppError(404, "CMS menu not found", "CMS_MENU_NOT_FOUND");
    return menu;
  },

  async createMenu(input: CreateCmsMenuInput) {
    const storeId = await getDefaultStoreId();
    const existing = await prisma.cmsMenu.findFirst({
      where: { storeId, handle: input.handle, deletedAt: null },
    });
    if (existing) throw new AppError(409, "CMS menu handle already exists", "CMS_MENU_HANDLE_EXISTS");

    return prisma.cmsMenu.create({
      data: { storeId, name: input.name, handle: input.handle },
      select: menuSelect,
    });
  },

  async updateMenu(id: string, input: UpdateCmsMenuInput) {
    const existing = await this.getMenuById(id);
    if (input.handle && input.handle !== existing.handle) {
      const handleTaken = await prisma.cmsMenu.findFirst({
        where: { storeId: existing.storeId, handle: input.handle, deletedAt: null, NOT: { id } },
      });
      if (handleTaken) {
        throw new AppError(409, "CMS menu handle already exists", "CMS_MENU_HANDLE_EXISTS");
      }
    }

    return prisma.cmsMenu.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.handle !== undefined ? { handle: input.handle } : {}),
      },
      select: menuSelect,
    });
  },

  async removeMenu(id: string) {
    await this.getMenuById(id);
    await prisma.cmsMenu.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
