import { AppError } from "../../shared/errors/app-error";
import { mapPipeline } from "../../shared/utils/pipeline-mapper";
import type { AuthContext } from "../../shared/types/auth-context";
import { requireOrganizationContext } from "../../shared/utils/auth-context";
import { pipelineRepository } from "./pipeline.repository";

export const pipelineService = {
  async listPipelines(auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    await pipelineRepository.ensureDefaultPipeline(organizationId);
    const pipelines = await pipelineRepository.list(organizationId);
    return pipelines.map(mapPipeline);
  },

  async getPipelineById(id: string, auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const pipeline = await pipelineRepository.findById(organizationId, id);
    if (!pipeline) throw new AppError(404, "Pipeline not found", "PIPELINE_NOT_FOUND");
    return mapPipeline(pipeline);
  },

  async getDefaultPipeline(auth: AuthContext) {
    const organizationId = requireOrganizationContext(auth);
    const pipeline = await pipelineRepository.ensureDefaultPipeline(organizationId);
    return mapPipeline(pipeline);
  },
};
