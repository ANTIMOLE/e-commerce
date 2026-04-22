import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Tiap file test dijalankan secara berurutan (bukan paralel)
    // karena tiap file adalah 1 session end-to-end yang stateful
    sequence: { concurrent: false },
    // Timeout per test 15 detik — cukup untuk request yang lambat
    testTimeout: 15_000,
    // Vitest tidak melempar error di unhandled rejection (axios non-2xx)
    // karena kita sudah set validateStatus: () => true
    globals: true,
    // Reporter verbose supaya semua test case kelihatan
    reporters: ["verbose"],
  },
});
