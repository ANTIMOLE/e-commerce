/**
 * vitest.unit.config.ts
 *
 * Letakkan file ini di root folder backend-rest/
 * Jalankan: pnpm vitest --config vitest.unit.config.ts
 *
 * Config ini men-cover semua unit test (whitebox) yang ada di
 * src/__tests__/unit/
 */

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "unit",
    globals: true,
    environment: "node",
    include: ["src/__tests__/unit/**/*.test.ts"],
    /**
     * Isolate setiap file test supaya vi.mock() tidak bocor
     * ke file test lain. Ini penting untuk unit test yang
     * meng-mock modul seperti prisma dan bcrypt.
     */
    isolate: true,
    /**
     * Setup file untuk env vars global
     */
    setupFiles: ["src/__tests__/unit/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: [
        "src/services/**/*.ts",
        "src/middlewares/**/*.ts",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/__tests__/**",
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      /**
       * Alias ini diperlukan karena service files meng-import
       * dari @ecommerce/shared. Sesuaikan path jika struktur
       * monorepo Anda berbeda.
       */
      "@ecommerce/shared": path.resolve(__dirname, "../../shared"),
    },
  },
});
