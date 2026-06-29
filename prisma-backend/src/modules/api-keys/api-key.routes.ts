import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./api-key.controller";
import { apiKeyIdParamSchema, createApiKeySchema, listApiKeysQuerySchema } from "./api-key.validation";

export const apiKeyRouter = Router();

const canRead = requirePermission(Permissions.ManageAll);
const canManage = requirePermission(Permissions.ManageAll);

apiKeyRouter.use(authenticate, resolveOrganization);

apiKeyRouter.get("/", canRead, validate({ query: listApiKeysQuerySchema }), controller.listApiKeys);
apiKeyRouter.post("/", canManage, validate({ body: createApiKeySchema }), controller.createApiKey);
apiKeyRouter.get("/:id", canRead, validate({ params: apiKeyIdParamSchema }), controller.getApiKey);
apiKeyRouter.delete("/:id", canManage, validate({ params: apiKeyIdParamSchema }), controller.deleteApiKey);
