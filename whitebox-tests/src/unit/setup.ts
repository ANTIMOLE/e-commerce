/**
 * setup.ts — Global setup untuk unit tests
 *
 * Letakkan di: backend-rest/src/__tests__/unit/setup.ts
 *
 * File ini dijalankan sebelum setiap test file.
 * Berisi env vars minimum agar service files bisa di-import
 * tanpa koneksi nyata ke database atau environment.
 */

import { vi } from "vitest";

// ─── Env vars global yang dibutuhkan oleh service files ───
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-minimum-32-chars-long";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-chars-long";
process.env.JWT_EXPIRY = "15m";
process.env.JWT_REFRESH_EXPIRY = "7d";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";

// ─── Suppress console.error dalam test output ───
// Comment baris ini jika ingin melihat error log dari service
vi.spyOn(console, "error").mockImplementation(() => {});
