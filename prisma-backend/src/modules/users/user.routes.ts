import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize, requirePermission } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Permissions } from "../../shared/constants/permissions";
import { Roles } from "../../shared/constants/roles";
import * as controller from "./user.controller";
import { createUserSchema, listUsersQuerySchema, updateUserSchema, userIdParamSchema } from "./user.validation";

export const userRouter = Router();

const canReadUsers = requirePermission(Permissions.ReadUsers, Permissions.ManageUsers);
const canManageUsers = requirePermission(Permissions.ManageUsers);

userRouter.get("/me", authenticate, controller.me);
userRouter.get("/", authenticate, canReadUsers, validate({ query: listUsersQuerySchema }), controller.listUsers);
userRouter.post("/", authenticate, canManageUsers, validate({ body: createUserSchema }), controller.createUser);
userRouter.get(
  "/:id",
  authenticate,
  canReadUsers,
  validate({ params: userIdParamSchema }),
  controller.getUser
);
userRouter.patch(
  "/:id",
  authenticate,
  canManageUsers,
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  controller.updateUser
);
userRouter.delete(
  "/:id",
  authenticate,
  authorize(Roles.Admin),
  canManageUsers,
  validate({ params: userIdParamSchema }),
  controller.deleteUser
);
