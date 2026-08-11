import { prisma } from "../../config/prisma";
import { AppError } from "../errors/app-error";

let cachedDefaultStoreId: string | null = null;

export const getDefaultStoreId = async (): Promise<string> => {
  if (cachedDefaultStoreId) return cachedDefaultStoreId;

  const store = await prisma.store.findFirst({
    where: { deletedAt: null, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!store) {
    throw new AppError(503, "No active store configured", "STORE_NOT_CONFIGURED");
  }

  cachedDefaultStoreId = store.id;
  return store.id;
};

export const clearDefaultStoreCache = () => {
  cachedDefaultStoreId = null;
};
