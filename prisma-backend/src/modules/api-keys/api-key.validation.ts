import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  expiresAt: z.coerce.date().optional(),
});

export const apiKeyIdParamSchema = z.object({ id: z.string().uuid() });

export const listApiKeysQuerySchema = paginationQuerySchema;

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type ListApiKeysQuery = z.infer<typeof listApiKeysQuerySchema>;
