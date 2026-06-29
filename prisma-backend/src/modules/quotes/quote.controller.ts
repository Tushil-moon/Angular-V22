import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListQuotesQuery } from "./quote.validation";
import { quoteService } from "./quote.service";

export const listQuotes = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListQuotesQuery>(req);
  const result = await quoteService.listQuotes(query, getAuthContext(req));
  return sendSuccess(res, result);
});

export const getQuote = asyncHandler(async (req, res) => {
  const quote = await quoteService.getQuoteById(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, quote);
});

export const createQuote = asyncHandler(async (req, res) => {
  const quote = await quoteService.createQuote(req.body, getAuthContext(req));
  return sendCreated(res, quote, "Quote created");
});

export const updateQuote = asyncHandler(async (req, res) => {
  const quote = await quoteService.updateQuote(String(req.params.id), req.body, getAuthContext(req));
  return sendSuccess(res, quote, "Quote updated");
});

export const deleteQuote = asyncHandler(async (req, res) => {
  await quoteService.deleteQuote(String(req.params.id), getAuthContext(req));
  return sendSuccess(res, null, "Quote deleted");
});
