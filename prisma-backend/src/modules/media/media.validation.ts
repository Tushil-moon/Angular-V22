import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const mediaIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listMediaQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  mimeType: z.string().optional(),
  sort: z.enum(["created_at", "updated_at", "filename", "size_bytes"]).optional().default("created_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const createMediaSchema = z.object({
  url: z.string().url(),
  storageKey: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  fileName: z.string().min(1).max(255),
  originalName: z.string().max(255).optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  altText: z.string().max(500).optional().nullable(),
});

export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;
export type CreateMediaInput = z.infer<typeof createMediaSchema>;
