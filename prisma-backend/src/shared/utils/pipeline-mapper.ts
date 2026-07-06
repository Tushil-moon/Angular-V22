import type { Prisma } from "@prisma/client";

export const pipelineStageSelect = {
  id: true,
  pipelineId: true,
  name: true,
  stageKey: true,
  probability: true,
  sortOrder: true,
  isClosed: true,
  isWon: true,
} satisfies Prisma.PipelineStageSelect;

export const pipelineSelect = {
  id: true,
  organizationId: true,
  name: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
  stages: {
    select: pipelineStageSelect,
    orderBy: { sortOrder: "asc" as const },
  },
} satisfies Prisma.PipelineSelect;

type PipelineRow = Prisma.PipelineGetPayload<{ select: typeof pipelineSelect }>;
type PipelineStageRow = Prisma.PipelineStageGetPayload<{ select: typeof pipelineStageSelect }>;

export const mapPipelineStage = (stage: PipelineStageRow) => ({
  id: stage.id,
  pipelineId: stage.pipelineId,
  name: stage.name,
  stageKey: stage.stageKey,
  probability: stage.probability,
  sortOrder: stage.sortOrder,
  isClosed: stage.isClosed,
  isWon: stage.isWon,
});

export const mapPipeline = (pipeline: PipelineRow) => ({
  id: pipeline.id,
  organizationId: pipeline.organizationId,
  name: pipeline.name,
  isDefault: pipeline.isDefault,
  stages: pipeline.stages.map(mapPipelineStage),
  createdAt: pipeline.createdAt,
  updatedAt: pipeline.updatedAt,
});

export const DEFAULT_PIPELINE_STAGES = [
  { name: "Lead", stageKey: "LEAD" as const, probability: 10, sortOrder: 0, isClosed: false, isWon: false },
  { name: "Qualified", stageKey: "QUALIFIED" as const, probability: 25, sortOrder: 1, isClosed: false, isWon: false },
  { name: "Proposal", stageKey: "PROPOSAL" as const, probability: 50, sortOrder: 2, isClosed: false, isWon: false },
  { name: "Negotiation", stageKey: "NEGOTIATION" as const, probability: 75, sortOrder: 3, isClosed: false, isWon: false },
  { name: "Won", stageKey: "WON" as const, probability: 100, sortOrder: 4, isClosed: true, isWon: true },
  { name: "Lost", stageKey: "LOST" as const, probability: 0, sortOrder: 5, isClosed: true, isWon: false },
];
