import crypto from "node:crypto";
import argon2 from "argon2";
import { env } from "../../config/env";

export const randomToken = (bytes = 48) => crypto.randomBytes(bytes).toString("base64url");

export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export const hashPassword = (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_COST,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
  });

export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);

export const hashOtp = (otp: string) => sha256(otp);

export const generateOtp = () => crypto.randomInt(100000, 999999).toString();
