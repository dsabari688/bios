import "dotenv/config";
import express from "express";
import cors from "cors";
import routes from "./routes.js";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

const app = express();

// Explicit CORS allowlist for development frontends. Requests without an
// Origin header (curl, server-to-server, same-origin proxy) are allowed.
const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:9000,http://127.0.0.1:9000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  }),
);
app.use(express.json());

// Lightweight request logger so API traffic is visible in the dev terminal.
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(
      `[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
    );
  });
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "LifeOS backend is running",
  });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
