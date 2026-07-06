import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListEmailSequencesQuery } from "./email-sequence.validation";
import { emailSequenceService } from "./email-sequence.service";

export const listSequences = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListEmailSequencesQuery>(req);
  const result = await emailSequenceService.listSequences(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getSequence = asyncHandler(async (req, res) => {
  const item = await emailSequenceService.getSequenceById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, item);
});

export const createSequence = asyncHandler(async (req, res) => {
  const item = await emailSequenceService.createSequence(req.body, getAuthContext(req));
  return sendCreated(res, item, "Email sequence created");
});

export const updateSequence = asyncHandler(async (req, res) => {
  const item = await emailSequenceService.updateSequence(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, item, "Email sequence updated");
});

export const deleteSequence = asyncHandler(async (req, res) => {
  await emailSequenceService.deleteSequence(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Email sequence deleted");
});
