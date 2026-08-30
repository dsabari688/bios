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
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production" ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("https://localhost") ||
        origin.startsWith("http://127.0.0.1") ||
        origin.startsWith("https://127.0.0.1") ||
        origin.startsWith("http://192.168.") ||
        origin.startsWith("https://192.168.") ||
        origin.startsWith("http://10.") ||
        origin.startsWith("https://10.") ||
        origin.startsWith("capacitor://") ||
        origin.startsWith("ionic://")
      ) {
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
    // Suppress noise from automatic 5-second sync heartbeats and health checks
    if (req.originalUrl.includes("/health") || (req.originalUrl.includes("/sync/pull") && res.statusCode === 200)) {
      return;
    }
    console.log(
      `[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
    );
  });
  next();
});

import os from "node:crypto";
import net from "node:os";

function getLocalIpAddresses(): string[] {
  const addresses: string[] = [];
  const interfaces = net.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

app.get("/api/health", (_req, res) => {
  const localIps = getLocalIpAddresses();
  const preferredIp = localIps.find((ip) => ip.startsWith("10.")) ||
    localIps.find((ip) => ip.startsWith("192.168.")) ||
    localIps.find((ip) => ip.startsWith("172.")) ||
    localIps[0] ||
    "localhost";
  res.json({
    success: true,
    message: "LifeOS backend is running",
    localIp: preferredIp,
    localIps,
    serverUrl: `http://${preferredIp}:${process.env.PORT ?? 5000}`,
  });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
