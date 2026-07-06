import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./sla.controller";
import {
  createQueueSchema,
  createSlaPolicySchema,
  listQueuesQuerySchema,
  listSlaPoliciesQuerySchema,
  queueIdParamSchema,
  slaPolicyIdParamSchema,
  updateQueueSchema,
  updateSlaPolicySchema,
} from "./sla.validation";

export const slaRouter = Router();

const canRead = requirePermission(Permissions.ReadActivities);
const canManage = requirePermission(Permissions.ManageActivities);

slaRouter.use(authenticate, resolveOrganization);

slaRouter.get("/policies", canRead, validate({ query: listSlaPoliciesQuerySchema }), controller.listPolicies);
slaRouter.post("/policies", canManage, validate({ body: createSlaPolicySchema }), controller.createPolicy);
slaRouter.get("/policies/:id", canRead, validate({ params: slaPolicyIdParamSchema }), controller.getPolicy);
slaRouter.patch(
  "/policies/:id",
  canManage,
  validate({ params: slaPolicyIdParamSchema, body: updateSlaPolicySchema }),
  controller.updatePolicy,
);
slaRouter.delete("/policies/:id", canManage, validate({ params: slaPolicyIdParamSchema }), controller.deletePolicy);

slaRouter.get("/queues", canRead, validate({ query: listQueuesQuerySchema }), controller.listQueues);
slaRouter.post("/queues", canManage, validate({ body: createQueueSchema }), controller.createQueue);
slaRouter.get("/queues/:id", canRead, validate({ params: queueIdParamSchema }), controller.getQueue);
slaRouter.patch(
  "/queues/:id",
  canManage,
  validate({ params: queueIdParamSchema, body: updateQueueSchema }),
  controller.updateQueue,
);
slaRouter.delete("/queues/:id", canManage, validate({ params: queueIdParamSchema }), controller.deleteQueue);
