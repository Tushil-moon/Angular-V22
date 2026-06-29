import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./territory.controller";
import {
  createTerritorySchema,
  listTerritoriesQuerySchema,
  territoryIdParamSchema,
  updateTerritorySchema,
} from "./territory.validation";

export const territoryRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

territoryRouter.use(authenticate, resolveOrganization);

territoryRouter.get("/", canRead, validate({ query: listTerritoriesQuerySchema }), controller.listTerritories);
territoryRouter.post("/", canManage, validate({ body: createTerritorySchema }), controller.createTerritory);
territoryRouter.get("/:id", canRead, validate({ params: territoryIdParamSchema }), controller.getTerritory);
territoryRouter.patch(
  "/:id",
  canManage,
  validate({ params: territoryIdParamSchema, body: updateTerritorySchema }),
  controller.updateTerritory,
);
territoryRouter.delete("/:id", canManage, validate({ params: territoryIdParamSchema }), controller.deleteTerritory);
