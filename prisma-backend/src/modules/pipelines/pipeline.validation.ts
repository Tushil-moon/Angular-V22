import { z } from "zod";

export const pipelineIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listPipelinesQuerySchema = z.object({}).optional();

export type ListPipelinesQuery = z.infer<typeof listPipelinesQuerySchema>;
