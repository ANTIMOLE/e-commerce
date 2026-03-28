import "./config/env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import * as trpcExpress from "@trpc/server/adapters/express";
import { env } from "./config/env";
import { appRouter } from "./routers";
import { createContext } from "./trpc/context";
import cookieParser from "cookie-parser";

const app: import("express").Express = express();

// ── Security & Parsing ────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// ── Health Check ──────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", api: "tRPC", timestamp: new Date().toISOString() });
});
app.use(cookieParser());

// ── tRPC Handler ──────────────────────────────────────────────
// createExpressMiddleware = adapter yang bertindak sebagai
// "glue" antara Express dan tRPC router (trpc.io/docs/server/adapters)
//
app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router:        appRouter,
    createContext,
    onError: ({ error, path }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`❌ tRPC error on [${path}]:`, error.message);
      }
    },
  })
);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route tidak ditemukan" });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`🚀 tRPC API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});

export default app;
export type { AppRouter } from "./routers";
