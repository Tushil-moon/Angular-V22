import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

const stickyColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const createStickyNoteSchema = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  content: z.string().max(50000).optional().default(""),
  color: stickyColorSchema.optional(),
  isPinned: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const updateStickyNoteSchema = z.object({
  title: z.string().trim().max(200).optional().nullable(),
  content: z.string().max(50000).optional(),
  color: stickyColorSchema.optional(),
  isPinned: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export const listStickyNotesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
});

export const stickyNoteIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateStickyNoteInput = z.infer<typeof createStickyNoteSchema>;
export type UpdateStickyNoteInput = z.infer<typeof updateStickyNoteSchema>;
export type ListStickyNotesQuery = z.infer<typeof listStickyNotesQuerySchema>;
