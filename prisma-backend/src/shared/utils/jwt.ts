import jwt, { type JwtPayload, type Secret } from "jsonwebtoken";
import { env } from "../../config/env";

export type AccessTokenPayload = {
  sub: string;
  sessionId: string;
  roles: string[];
};

export const signAccessToken = (payload: AccessTokenPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, { expiresIn: env.ACCESS_TOKEN_TTL as never });

export const signEmailToken = (userId: string) =>
  jwt.sign({ sub: userId, typ: "email-verification" }, env.JWT_EMAIL_SECRET as Secret, {
    expiresIn: env.EMAIL_TOKEN_TTL as never,
  });

export const signPasswordResetToken = (userId: string) =>
  jwt.sign({ sub: userId, typ: "password-reset" }, env.JWT_PASSWORD_RESET_SECRET as Secret, {
    expiresIn: env.PASSWORD_RESET_TOKEN_TTL as never,
  });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET as Secret) as JwtPayload & AccessTokenPayload;
