/**
 * vitest.security.config.ts
 *
 * Letakkan di: api-tests/
 * Jalankan: pnpm vitest --config vitest.security.config.ts
 *
 * Butuh server berjalan:
 *   REST  → http://localhost:4000
 *   tRPC  → http://localhost:4001
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "security",
    globals: true,
    environment: "node",
    include: ["src/security/**/*.test.ts"],
    sequence: { concurrent: false }, // jalankan berurutan
    testTimeout: 30_000, // security test kadang butuh waktu lebih lama
    reporters: ["verbose"],
  },
});
