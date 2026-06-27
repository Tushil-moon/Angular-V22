import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { validate } from "../../middlewares/validate";
import * as controller from "./search.controller";
import { searchQuerySchema } from "./search.validation";

export const searchRouter = Router();

searchRouter.get("/", authenticate, resolveOrganization, validate({ query: searchQuerySchema }), controller.globalSearch);
