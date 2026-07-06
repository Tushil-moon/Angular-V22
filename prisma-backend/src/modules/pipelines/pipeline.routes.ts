import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./pipeline.controller";
import { pipelineIdParamSchema } from "./pipeline.validation";

export const pipelineRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);

pipelineRouter.use(authenticate, resolveOrganization);

pipelineRouter.get("/", canRead, controller.listPipelines);
pipelineRouter.get("/default", canRead, controller.getDefaultPipeline);
pipelineRouter.get(
  "/:id",
  canRead,
  validate({ params: pipelineIdParamSchema }),
  controller.getPipeline,
);
