import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./forecast.controller";
import {
  createForecastSchema,
  forecastIdParamSchema,
  listForecastsQuerySchema,
  updateForecastSchema,
} from "./forecast.validation";

export const forecastRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

forecastRouter.use(authenticate, resolveOrganization);

forecastRouter.get("/", canRead, validate({ query: listForecastsQuerySchema }), controller.listForecasts);
forecastRouter.post("/", canManage, validate({ body: createForecastSchema }), controller.createForecast);
forecastRouter.get("/:id", canRead, validate({ params: forecastIdParamSchema }), controller.getForecast);
forecastRouter.patch(
  "/:id",
  canManage,
  validate({ params: forecastIdParamSchema, body: updateForecastSchema }),
  controller.updateForecast,
);
forecastRouter.delete("/:id", canManage, validate({ params: forecastIdParamSchema }), controller.deleteForecast);
