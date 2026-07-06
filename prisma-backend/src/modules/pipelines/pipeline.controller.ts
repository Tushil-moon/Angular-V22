import { asyncHandler } from "../../shared/utils/async-handler";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendSuccess } from "../../shared/utils/response";
import { pipelineService } from "./pipeline.service";

export const listPipelines = asyncHandler(async (req, res) => {
  const pipelines = await pipelineService.listPipelines(getAuthContext(req));
  return sendSuccess(res, pipelines);
});

export const getDefaultPipeline = asyncHandler(async (req, res) => {
  const pipeline = await pipelineService.getDefaultPipeline(getAuthContext(req));
  return sendSuccess(res, pipeline);
});

export const getPipeline = asyncHandler(async (req, res) => {
  const pipeline = await pipelineService.getPipelineById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, pipeline);
});
