import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import { getUploadStorageMode } from "./shared/storage/object-storage";

const verifyDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection verified");
  } catch (error) {
    logger.error(
      {
        err: error,
        hint: "Update DATABASE_URL and DIRECT_URL in .env from Supabase → Project Settings → Database",
      },
      "Database connection failed"
    );
  }
};

void verifyDatabaseConnection();

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
  logger.info(
    {
      storage: getUploadStorageMode(),
      uploadDir: env.uploadDirAbsolute,
      publicBaseUrl: env.publicBaseUrl,
    },
    "Media storage configured",
  );
});

const shutdown = async () => {
  logger.info("Shutting down server");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
