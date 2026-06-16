import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authorize } from "../../middlewares/authorize";
import { validate } from "../../middlewares/validate";
import { Roles } from "../../shared/constants/roles";
import * as controller from "./user.controller";
import { createUserSchema, updateUserSchema, userIdParamSchema } from "./user.validation";

export const userRouter = Router();

userRouter.get("/me", authenticate, controller.me);
userRouter.get("/", authenticate, authorize(Roles.Admin), controller.listUsers);
userRouter.post("/", authenticate, authorize(Roles.Admin), validate({ body: createUserSchema }), controller.createUser);
userRouter.get(
  "/:id",
  authenticate,
  authorize(Roles.Admin),
  validate({ params: userIdParamSchema }),
  controller.getUser
);
userRouter.patch(
  "/:id",
  authenticate,
  authorize(Roles.Admin),
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  controller.updateUser
);
userRouter.delete(
  "/:id",
  authenticate,
  authorize(Roles.Admin),
  validate({ params: userIdParamSchema }),
  controller.deleteUser
);
