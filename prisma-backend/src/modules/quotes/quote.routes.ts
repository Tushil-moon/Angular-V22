import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./quote.controller";
import {
  createQuoteSchema,
  listQuotesQuerySchema,
  quoteIdParamSchema,
  updateQuoteSchema,
} from "./quote.validation";

export const quoteRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

quoteRouter.use(authenticate, resolveOrganization);

quoteRouter.get("/", canRead, validate({ query: listQuotesQuerySchema }), controller.listQuotes);
quoteRouter.post("/", canManage, validate({ body: createQuoteSchema }), controller.createQuote);
quoteRouter.get("/:id", canRead, validate({ params: quoteIdParamSchema }), controller.getQuote);
quoteRouter.patch(
  "/:id",
  canManage,
  validate({ params: quoteIdParamSchema, body: updateQuoteSchema }),
  controller.updateQuote,
);
quoteRouter.delete("/:id", canManage, validate({ params: quoteIdParamSchema }), controller.deleteQuote);
