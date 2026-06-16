import { Router } from "express";
import { authenticate } from "../../middlewares/authenticate";
import { authLimiter } from "../../middlewares/rate-limit";
import { validate } from "../../middlewares/validate";
import * as controller from "./auth.controller";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  requestEmailVerificationSchema,
  requestOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyOtpSchema,
} from "./auth.validation";

export const authRouter = Router();

authRouter.post("/register", authLimiter, validate({ body: registerSchema }), controller.register);
authRouter.post("/login", authLimiter, validate({ body: loginSchema }), controller.login);
authRouter.post("/refresh", validate({ body: refreshSchema }), controller.refresh);
authRouter.post("/otp/request", authLimiter, validate({ body: requestOtpSchema }), controller.requestOtp);
authRouter.post("/otp/verify", authLimiter, validate({ body: verifyOtpSchema }), controller.verifyOtp);
authRouter.post("/email/request-verification", authLimiter, validate({ body: requestEmailVerificationSchema }), controller.requestEmailVerification);
authRouter.post("/email/verify", validate({ body: verifyEmailSchema }), controller.verifyEmail);
authRouter.post("/password/forgot", authLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);
authRouter.post("/password/reset", authLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);
authRouter.post("/password/change", authenticate, validate({ body: changePasswordSchema }), controller.changePassword);
authRouter.post("/logout", authenticate, controller.logout);
authRouter.post("/logout-all", authenticate, controller.logoutAll);
