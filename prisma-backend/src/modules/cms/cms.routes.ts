import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./cms.controller";
import {
  cmsBannerIdParamSchema,
  cmsMenuIdParamSchema,
  cmsPageIdParamSchema,
  createCmsBannerSchema,
  createCmsMenuSchema,
  createCmsPageSchema,
  listCmsBannersQuerySchema,
  listCmsMenusQuerySchema,
  listCmsPagesQuerySchema,
  updateCmsBannerSchema,
  updateCmsMenuSchema,
  updateCmsPageSchema,
} from "./cms.validation";

export const cmsRouter = Router();

const canRead = requirePermission(Permissions.ReadCms, Permissions.ManageCms);
const canManage = requirePermission(Permissions.ManageCms);

cmsRouter.use(authenticate);

cmsRouter.get("/pages", canRead, validate({ query: listCmsPagesQuerySchema }), controller.listPages);
cmsRouter.post("/pages", canManage, validate({ body: createCmsPageSchema }), controller.createPage);
cmsRouter.get("/pages/:id", canRead, validate({ params: cmsPageIdParamSchema }), controller.getPage);
cmsRouter.patch(
  "/pages/:id",
  canManage,
  validate({ params: cmsPageIdParamSchema, body: updateCmsPageSchema }),
  controller.updatePage,
);
cmsRouter.delete(
  "/pages/:id",
  canManage,
  validate({ params: cmsPageIdParamSchema }),
  controller.deletePage,
);

cmsRouter.get(
  "/banners",
  canRead,
  validate({ query: listCmsBannersQuerySchema }),
  controller.listBanners,
);
cmsRouter.post("/banners", canManage, validate({ body: createCmsBannerSchema }), controller.createBanner);
cmsRouter.patch(
  "/banners/:id",
  canManage,
  validate({ params: cmsBannerIdParamSchema, body: updateCmsBannerSchema }),
  controller.updateBanner,
);
cmsRouter.delete(
  "/banners/:id",
  canManage,
  validate({ params: cmsBannerIdParamSchema }),
  controller.deleteBanner,
);

cmsRouter.get("/menus", canRead, validate({ query: listCmsMenusQuerySchema }), controller.listMenus);
cmsRouter.post("/menus", canManage, validate({ body: createCmsMenuSchema }), controller.createMenu);
cmsRouter.get("/menus/:id", canRead, validate({ params: cmsMenuIdParamSchema }), controller.getMenu);
cmsRouter.patch(
  "/menus/:id",
  canManage,
  validate({ params: cmsMenuIdParamSchema, body: updateCmsMenuSchema }),
  controller.updateMenu,
);
cmsRouter.delete(
  "/menus/:id",
  canManage,
  validate({ params: cmsMenuIdParamSchema }),
  controller.deleteMenu,
);
