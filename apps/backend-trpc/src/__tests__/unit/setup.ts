/**
 * setup.ts — Global test setup untuk backend-trpc unit tests
 *
 * Di-load sebelum setiap test file via `setupFiles` di vitest.unit.config.ts
 */

import { vi } from "vitest";

// Pastikan NODE_ENV = test supaya env.ts tidak crash
process.env.NODE_ENV        = "test";
process.env.DATABASE_URL    = "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET      = "test-jwt-secret-minimum-32-chars-long!!";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-chars!!";
process.env.JWT_EXPIRY      = "15m";
process.env.JWT_REFRESH_EXPIRY = "7d";
process.env.FRONTEND_URL    = "http://localhost:3000";

// Suppress console.error di test output (masih bisa di-spy jika perlu)
vi.spyOn(console, "error").mockImplementation(() => {});
