import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendSuccess } from "../../shared/utils/response";
import type { ListAuditLogsQuery } from "./audit-log.validation";
import { auditLogService } from "./audit-log.service";

export const listAuditLogs = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListAuditLogsQuery>(req);
  const result = await auditLogService.listAuditLogs(query);
  return sendSuccess(res, result);
});
