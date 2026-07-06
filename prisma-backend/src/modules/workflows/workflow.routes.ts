import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./workflow.controller";
import {
  createWorkflowSchema,
  listWorkflowsQuerySchema,
  testWorkflowSchema,
  updateWorkflowSchema,
  workflowIdParamSchema,
} from "./workflow.validation";

export const workflowRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

workflowRouter.use(authenticate, resolveOrganization);

workflowRouter.get("/", canRead, validate({ query: listWorkflowsQuerySchema }), controller.listWorkflows);
workflowRouter.post("/", canManage, validate({ body: createWorkflowSchema }), controller.createWorkflow);
workflowRouter.get("/:id", canRead, validate({ params: workflowIdParamSchema }), controller.getWorkflow);
workflowRouter.get(
  "/:id/runs",
  canRead,
  validate({ params: workflowIdParamSchema, query: listWorkflowsQuerySchema }),
  controller.listWorkflowRuns,
);
workflowRouter.post(
  "/:id/test",
  canManage,
  validate({ params: workflowIdParamSchema, body: testWorkflowSchema }),
  controller.testWorkflow,
);
workflowRouter.post(
  "/:id/activate",
  canManage,
  validate({ params: workflowIdParamSchema }),
  controller.activateWorkflow,
);
workflowRouter.post(
  "/:id/deactivate",
  canManage,
  validate({ params: workflowIdParamSchema }),
  controller.deactivateWorkflow,
);
workflowRouter.patch(
  "/:id",
  canManage,
  validate({ params: workflowIdParamSchema, body: updateWorkflowSchema }),
  controller.updateWorkflow,
);
workflowRouter.delete("/:id", canManage, validate({ params: workflowIdParamSchema }), controller.deleteWorkflow);
