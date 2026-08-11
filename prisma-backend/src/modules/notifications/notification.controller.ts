import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { AppError } from "../../shared/errors/app-error";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListNotificationsQuery, ListTemplatesQuery } from "./notification.validation";
import { notificationService } from "./notification.service";

const requireUserId = (req: { user?: { id: string } }) => {
  if (!req.user?.id) throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  return req.user.id;
};

export const listNotifications = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const query = getValidatedQuery<ListNotificationsQuery>(req);
  const result = await notificationService.listForUser(userId, query);
  return sendSuccess(res, result);
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const notification = await notificationService.markRead(userId, String(req.params.id));
  return sendSuccess(res, notification, "Notification marked as read");
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const result = await notificationService.markAllRead(userId);
  return sendSuccess(res, result, "All notifications marked as read");
});

export const listTemplates = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListTemplatesQuery>(req);
  const result = await notificationService.listTemplates(query);
  return sendSuccess(res, result);
});

export const createTemplate = asyncHandler(async (req, res) => {
  const template = await notificationService.createTemplate(req.body);
  return sendCreated(res, template, "Notification template created");
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const template = await notificationService.updateTemplate(String(req.params.id), req.body);
  return sendSuccess(res, template, "Notification template updated");
});
