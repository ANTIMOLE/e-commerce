/**
 * vitest.unit.config.ts
 *
 * Letakkan di: backend-trpc/
 * Jalankan   : pnpm vitest --config vitest.unit.config.ts
 */

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "unit",
    globals: true,
    environment: "node",
    include: ["src/__tests__/unit/**/*.test.ts"],
    isolate: true,
    setupFiles: ["src/__tests__/unit/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: ["src/services/**/*.ts", "src/trpc/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/__tests__/**"],
      thresholds: {
        statements: 70,
        branches:   65,
        functions:  70,
        lines:      70,
      },
    },
  },
  resolve: {
    alias: {
      "@ecommerce/shared": path.resolve(__dirname, "../../shared"),
    },
  },
});
