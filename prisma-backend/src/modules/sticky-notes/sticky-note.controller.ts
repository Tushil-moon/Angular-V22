import { asyncHandler } from "../../shared/utils/async-handler";
import { getAuthContext } from "../../shared/utils/auth-context";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListStickyNotesQuery } from "./sticky-note.validation";
import { stickyNoteService } from "./sticky-note.service";

export const listStickyNotes = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListStickyNotesQuery>(req);
  const result = await stickyNoteService.listStickyNotes(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getStickyNote = asyncHandler(async (req, res) => {
  const note = await stickyNoteService.getStickyNoteById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, note);
});

export const createStickyNote = asyncHandler(async (req, res) => {
  const note = await stickyNoteService.createStickyNote(req.body, getAuthContext(req));
  return sendCreated(res, note, "Sticky note created");
});

export const updateStickyNote = asyncHandler(async (req, res) => {
  const note = await stickyNoteService.updateStickyNote(
    String(req.params.id),
    req.body,
    getAuthContext(req),
  );
  return sendSuccess(res, note, "Sticky note updated");
});

export const deleteStickyNote = asyncHandler(async (req, res) => {
  await stickyNoteService.deleteStickyNote(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Sticky note deleted");
});
