import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { resolveOrganization } from "../../middlewares/resolve-organization";
import { requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import * as controller from "./quote.controller";
import {
  createQuoteSchema,
  exportQuotesQuerySchema,
  listQuotesQuerySchema,
  quoteIdParamSchema,
  updateQuoteSchema,
} from "./quote.validation";

export const quoteRouter = Router();

const canRead = requirePermission(Permissions.ReadDeals);
const canManage = requirePermission(Permissions.ManageDeals);

quoteRouter.use(authenticate, resolveOrganization);

quoteRouter.get("/", canRead, validate({ query: listQuotesQuerySchema }), controller.listQuotes);
quoteRouter.get(
  "/export",
  canRead,
  validate({ query: exportQuotesQuerySchema }),
  controller.exportQuotes,
);
quoteRouter.post("/", canManage, validate({ body: createQuoteSchema }), controller.createQuote);
quoteRouter.get("/:id", canRead, validate({ params: quoteIdParamSchema }), controller.getQuote);
quoteRouter.get(
  "/:id/history",
  canRead,
  validate({ params: quoteIdParamSchema }),
  controller.listQuoteHistory,
);
quoteRouter.patch(
  "/:id",
  canManage,
  validate({ params: quoteIdParamSchema, body: updateQuoteSchema }),
  controller.updateQuote,
);
quoteRouter.post(
  "/:id/send",
  canManage,
  validate({ params: quoteIdParamSchema }),
  controller.sendQuote,
);
quoteRouter.post(
  "/:id/accept",
  canManage,
  validate({ params: quoteIdParamSchema }),
  controller.acceptQuote,
);
quoteRouter.post(
  "/:id/reject",
  canManage,
  validate({ params: quoteIdParamSchema }),
  controller.rejectQuote,
);
quoteRouter.delete("/:id", canManage, validate({ params: quoteIdParamSchema }), controller.deleteQuote);
