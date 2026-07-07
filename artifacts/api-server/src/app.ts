import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { defaultRateLimit } from "./middleware/rateLimit.js";
import { recordRequest, recordError } from "./routes/monitor.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(defaultRateLimit);

app.use((_req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    recordRequest(duration);
    if (res.statusCode >= 500) {
      recordError(`${res.statusCode} on ${_req.method} ${_req.path?.split("?")[0] ?? ""}`);
    }
  });
  next();
});

app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("X-XSS-Protection", "1; mode=block");
  next();
});

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const frontendDist = path.resolve(
    globalThis.__dirname ?? import.meta.dirname,
    "../../skill-league/dist/public",
  );
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  } else {
    logger.warn({ frontendDist }, "Frontend build not found — static serving skipped");
  }
}

export default app;
