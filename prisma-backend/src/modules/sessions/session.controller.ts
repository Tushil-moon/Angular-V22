import { asyncHandler } from "../../shared/utils/async-handler";
import { sendSuccess } from "../../shared/utils/response";
import { sessionService } from "./session.service";

export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await sessionService.listSessions(req.user!.id, req.user!.sessionId);
  return sendSuccess(res, sessions);
});

export const revokeSession = asyncHandler(async (req, res) => {
  await sessionService.revokeSession(req.user!.id, String(req.params.id));
  return sendSuccess(res, null, "Session revoked");
});
