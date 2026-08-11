import { z } from "zod";

export const analyticsQuerySchema = z.object({
  from: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  to: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
