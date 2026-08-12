import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { corsOptions } from "./config/cors";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { swaggerSpec } from "./docs/swagger";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { generalLimiter } from "./middlewares/rate-limit";
import { router } from "./routes";

const app = express();

app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use(generalLimiter);

app.use(
  "/uploads",
  express.static(path.resolve(env.UPLOAD_DIR), {
    maxAge: env.NODE_ENV === "production" ? "7d" : 0,
    fallthrough: true,
  }),
);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/v1", router);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
