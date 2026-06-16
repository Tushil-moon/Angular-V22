import type { Request } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import { authService } from "./auth.service";

const meta = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
  deviceId: req.get("x-device-id") ?? req.ip ?? "unknown-device",
});

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, meta(req));
  return sendCreated(res, result, "Registered successfully");
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, meta(req));
  return sendSuccess(res, result, "Logged in successfully");
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken, meta(req));
  return sendSuccess(res, result, "Token refreshed");
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user!.id, req.user!.sessionId, meta(req));
  return sendSuccess(res, null, "Logged out");
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user!.id, meta(req));
  return sendSuccess(res, null, "Logged out from all devices");
});

export const requestOtp = asyncHandler(async (req, res) => {
  const result = await authService.requestOtp(req.body.phone, req.body.purpose, meta(req));
  return sendSuccess(res, result, "OTP sent");
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body, meta(req));
  return sendSuccess(res, result, "OTP verified");
});

export const requestEmailVerification = asyncHandler(async (req, res) => {
  const result = await authService.requestEmailVerification(req.body.email, meta(req));
  return sendSuccess(res, result, "Verification email sent");
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body.token, meta(req));
  return sendSuccess(res, result, "Email verified");
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email, meta(req));
  return sendSuccess(res, result, "Password reset instructions sent");
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body.token, req.body.password, meta(req));
  return sendSuccess(res, result, "Password reset completed");
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword, meta(req));
  return sendSuccess(res, result, "Password changed");
});
