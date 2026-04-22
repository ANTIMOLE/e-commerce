import { config } from "dotenv";

// Load .env dari working directory saat npm run dijalankan
config();

export const REST_URL =
  process.env.REST_URL ?? "http://localhost:4000/api/v1";
export const TRPC_URL =
  process.env.TRPC_URL ?? "http://localhost:4001/trpc";
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? "admin1@zenit.dev";
export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ?? "Password123!";
export const TEST_PASSWORD = "TestPass123!";
