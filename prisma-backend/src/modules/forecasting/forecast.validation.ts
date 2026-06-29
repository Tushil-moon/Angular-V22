import { z } from "zod";
import { paginationQuerySchema } from "../../shared/validation/pagination";

export const createForecastSchema = z.object({
  userId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  quota: z.coerce.number().nonnegative(),
  closedAmount: z.coerce.number().nonnegative().optional(),
});

export const updateForecastSchema = createForecastSchema.partial();

export const forecastIdParamSchema = z.object({ id: z.string().uuid() });

export const listForecastsQuerySchema = paginationQuerySchema.extend({
  userId: z.string().uuid().optional(),
});

export type CreateForecastInput = z.infer<typeof createForecastSchema>;
export type UpdateForecastInput = z.infer<typeof updateForecastSchema>;
export type ListForecastsQuery = z.infer<typeof listForecastsQuerySchema>;
