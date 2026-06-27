import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { getAuthContext } from "../../shared/utils/auth-context";
import { sendSuccess } from "../../shared/utils/response";
import type { SearchQuery } from "./search.validation";
import { searchService } from "./search.service";

export const globalSearch = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<SearchQuery>(req);
  const results = await searchService.globalSearch(query, getAuthContext(req));
  return sendSuccess(res, results);
});
