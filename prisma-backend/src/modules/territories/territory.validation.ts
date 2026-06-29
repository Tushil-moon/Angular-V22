import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createTerritorySchema = z.object({
  name: z.string().trim().min(1).max(200),
  rules: z.record(z.string(), z.unknown()).optional(),
});

export const updateTerritorySchema = createTerritorySchema.partial();

export const territoryIdParamSchema = z.object({ id: z.string().uuid() });

export const listTerritoriesQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
});

export type CreateTerritoryInput = z.infer<typeof createTerritorySchema>;
export type UpdateTerritoryInput = z.infer<typeof updateTerritorySchema>;
export type ListTerritoriesQuery = z.infer<typeof listTerritoriesQuerySchema>;
