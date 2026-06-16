import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";

export const healthService = {
  async check() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { database: "connected" as const };
    } catch {
      throw new AppError(503, "Database unavailable", "DATABASE_UNAVAILABLE", { database: "disconnected" });
    }
  },
};
