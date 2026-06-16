import { asyncHandler } from "../../shared/utils/async-handler";
import { getValidatedQuery } from "../../middlewares/validate";
import { sendCreated, sendSuccess } from "../../shared/utils/response";
import type { ListUsersQuery } from "./user.validation";
import { userService } from "./user.service";

export const me = asyncHandler(async (req, res) => {
  const user = await userService.getMe(req.user!.id);
  return sendSuccess(res, user);
});

export const listUsers = asyncHandler(async (req, res) => {
  const query = getValidatedQuery<ListUsersQuery>(req);
  const result = await userService.listUsers(query);
  return sendSuccess(res, result);
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(String(req.params.id));
  return sendSuccess(res, user);
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  return sendCreated(res, user, "User created");
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(String(req.params.id), req.body);
  return sendSuccess(res, user, "User updated");
});

export const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(String(req.params.id), req.user!.id);
  return sendSuccess(res, null, "User deleted");
});
