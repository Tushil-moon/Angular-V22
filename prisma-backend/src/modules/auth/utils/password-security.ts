import { env } from "../../../config/env";
import { verifyPassword } from "../../../shared/utils/crypto";
import { AppError } from "../../../shared/errors/app-error";
import { userSecurityRepository } from "../repositories/user-security.repository";

export const assertPasswordNotReused = async (
  userId: string,
  newPassword: string,
  currentHash?: string | null,
): Promise<void> => {
  const history = await userSecurityRepository.getRecentPasswordHashes(
    userId,
    env.PASSWORD_HISTORY_COUNT,
  );
  const candidates = [currentHash, ...history.map((row) => row.passwordHash)].filter(
    (hash): hash is string => Boolean(hash),
  );

  for (const hash of candidates) {
    if (await verifyPassword(hash, newPassword)) {
      throw new AppError(400, "Cannot reuse a recent password", "PASSWORD_REUSED");
    }
  }
};

export const archivePasswordHash = async (userId: string, passwordHash: string): Promise<void> => {
  await userSecurityRepository.appendPasswordHistory(userId, passwordHash);
  await userSecurityRepository.trimPasswordHistory(userId, env.PASSWORD_HISTORY_COUNT);
};
