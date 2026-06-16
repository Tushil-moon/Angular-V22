import type { Request } from "express";
import type { RequestMeta } from "../types/request-meta";

export const getRequestMeta = (req: Request): RequestMeta => ({
  ipAddress: req.ip,
  userAgent: req.get("user-agent") ?? undefined,
  deviceId: req.get("x-device-id") ?? req.ip ?? "unknown-device",
});
