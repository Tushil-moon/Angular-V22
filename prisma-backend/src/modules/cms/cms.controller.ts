import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListCmsBannersQuery, ListCmsMenusQuery, ListCmsPagesQuery } from "./cms.validation";
import { cmsService } from "./cms.service";

export const listPages = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCmsPagesQuery>(req);
  const result = await cmsService.listPages(query);
  return sendSuccess(res, result);
});

export const getPage = asyncHandler(async (req, res) => {
  const page = await cmsService.getPageById(String(req.params.id));
  return sendSuccess(res, page);
});

export const createPage = asyncHandler(async (req, res) => {
  const page = await cmsService.createPage(req.body);
  return sendCreated(res, page, "CMS page created");
});

export const updatePage = asyncHandler(async (req, res) => {
  const page = await cmsService.updatePage(String(req.params.id), req.body);
  return sendSuccess(res, page, "CMS page updated");
});

export const deletePage = asyncHandler(async (req, res) => {
  await cmsService.removePage(String(req.params.id));
  return sendSuccess(res, null, "CMS page deleted");
});

export const listBanners = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCmsBannersQuery>(req);
  const result = await cmsService.listBanners(query);
  return sendSuccess(res, result);
});

export const createBanner = asyncHandler(async (req, res) => {
  const banner = await cmsService.createBanner(req.body);
  return sendCreated(res, banner, "CMS banner created");
});

export const updateBanner = asyncHandler(async (req, res) => {
  const banner = await cmsService.updateBanner(String(req.params.id), req.body);
  return sendSuccess(res, banner, "CMS banner updated");
});

export const deleteBanner = asyncHandler(async (req, res) => {
  await cmsService.removeBanner(String(req.params.id));
  return sendSuccess(res, null, "CMS banner deleted");
});

export const listMenus = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListCmsMenusQuery>(req);
  return sendSuccess(res, await cmsService.listMenus(query));
});

export const getMenu = asyncHandler(async (req, res) =>
  sendSuccess(res, await cmsService.getMenuById(String(req.params.id))),
);

export const createMenu = asyncHandler(async (req, res) =>
  sendCreated(res, await cmsService.createMenu(req.body), "CMS menu created"),
);

export const updateMenu = asyncHandler(async (req, res) =>
  sendSuccess(res, await cmsService.updateMenu(String(req.params.id), req.body), "CMS menu updated"),
);

export const deleteMenu = asyncHandler(async (req, res) => {
  await cmsService.removeMenu(String(req.params.id));
  return sendSuccess(res, null, "CMS menu deleted");
});
