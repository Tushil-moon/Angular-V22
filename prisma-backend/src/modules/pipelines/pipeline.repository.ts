import type { DealStage, Prisma } from "@prisma/client";

import { prisma } from "../../config/prisma";
import { DEFAULT_PIPELINE_STAGES, pipelineSelect } from "../../shared/utils/pipeline-mapper";

export const pipelineRepository = {
  findDefault(organizationId: string) {
    return prisma.pipeline.findFirst({
      where: { organizationId, isDefault: true },
      select: pipelineSelect,
    });
  },

  findById(organizationId: string, id: string) {
    return prisma.pipeline.findFirst({
      where: { id, organizationId },
      select: pipelineSelect,
    });
  },

  list(organizationId: string) {
    return prisma.pipeline.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: pipelineSelect,
    });
  },

  findStageById(stageId: string) {
    return prisma.pipelineStage.findUnique({
      where: { id: stageId },
      include: { pipeline: true },
    });
  },

  findStageByKey(pipelineId: string, stageKey: DealStage) {
    return prisma.pipelineStage.findUnique({
      where: { pipelineId_stageKey: { pipelineId, stageKey } },
    });
  },

  listOpenStages(pipelineId: string) {
    return prisma.pipelineStage.findMany({
      where: { pipelineId, isClosed: false },
      orderBy: { sortOrder: "asc" },
    });
  },

  ensureDefaultPipeline(organizationId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.pipeline.findFirst({
        where: { organizationId, isDefault: true },
        select: pipelineSelect,
      });
      if (existing) return existing;

      const pipeline = await tx.pipeline.create({
        data: {
          organizationId,
          name: "Sales Pipeline",
          isDefault: true,
          stages: {
            create: DEFAULT_PIPELINE_STAGES.map((stage) => ({
              name: stage.name,
              stageKey: stage.stageKey,
              probability: stage.probability,
              sortOrder: stage.sortOrder,
              isClosed: stage.isClosed,
              isWon: stage.isWon,
            })),
          },
        },
        select: pipelineSelect,
      });

      return pipeline;
    });
  },
};
