// =============================================================
// helpers/config.js — Shared configuration for all k6 scenarios
//
// FIX: Hapus error_rate dari THRESHOLDS_BASE karena skenario sekarang
// pakai functional_error_rate dan sla_breach_rate yang terpisah.
// error_rate lama yang mencampur 4xx/5xx dengan latency breach sudah deprecated.
// =============================================================

export const API_TYPE = __ENV.API || "rest"; // "rest" | "trpc"
export const TEST_TYPE = __ENV.TEST_TYPE || "load"; // "load" | "stress" | "spike" | "soak"

// Base URLs — update ke VPS IP sebelum run
export const BASE_URL = {
  rest: __ENV.REST_URL || "http://localhost:4000/api/v1",
  trpc: __ENV.TRPC_URL || "http://localhost:4001/trpc",
};
export const BASE = BASE_URL[API_TYPE];

export const HEALTH_URL =
  API_TYPE === "rest"
    ? BASE.replace("/api/v1", "") + "/health"
    : BASE.replace("/trpc", "") + "/health";

// =============================================================
// STAGE DEFINITIONS
// =============================================================

export const STAGES = {
  // Load Test — 3 tahap (50→100→200 VU), 15 menit steady each
  load: [
    { duration: "2m", target: 50 },
    { duration: "15m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "15m", target: 100 },
    { duration: "1m", target: 200 },
    { duration: "15m", target: 200 },
    { duration: "2m", target: 0 },
  ],

  // Stress Test — start 200 VU, +50 tiap 5 menit
  stress: [
    { duration: "2m", target: 200 },
    { duration: "5m", target: 200 },
    { duration: "1m", target: 250 },
    { duration: "5m", target: 250 },
    { duration: "1m", target: 300 },
    { duration: "5m", target: 300 },
    { duration: "1m", target: 350 },
    { duration: "5m", target: 350 },
    { duration: "1m", target: 400 },
    { duration: "5m", target: 400 },
    { duration: "1m", target: 450 },
    { duration: "5m", target: 450 },
    { duration: "1m", target: 500 },
    { duration: "5m", target: 500 },
    { duration: "2m", target: 0 },
  ],

  // Spike Test — 50 baseline → 500 spike (2m) → back to 50
  spike: [
    { duration: "5m", target: 50 },
    { duration: "10s", target: 500 },
    { duration: "2m", target: 500 },
    { duration: "10s", target: 50 },
    { duration: "5m", target: 50 },
    { duration: "30s", target: 0 },
  ],

  // Soak Test — 150 VU for 4h minimum
  soak: [
    { duration: "5m", target: 150 },
    { duration: "4h", target: 150 }, // ubah ke "8h" untuk full soak
    { duration: "5m", target: 0 },
  ],

  // Auth-specific stages
  load_auth: [
    { duration: "2m", target: 50 },
    { duration: "15m", target: 50 },
    { duration: "1m", target: 100 },
    { duration: "15m", target: 100 },
    { duration: "2m", target: 0 },
  ],
  stress_auth: [
    { duration: "2m", target: 100 },
    { duration: "5m", target: 100 },
    { duration: "1m", target: 150 },
    { duration: "5m", target: 150 },
    { duration: "1m", target: 200 },
    { duration: "5m", target: 200 },
    { duration: "1m", target: 300 },
    { duration: "5m", target: 300 },
    { duration: "2m", target: 0 },
  ],
  spike_auth: [
    { duration: "5m", target: 50 },
    { duration: "10s", target: 300 },
    { duration: "2m", target: 300 },
    { duration: "10s", target: 50 },
    { duration: "5m", target: 50 },
    { duration: "30s", target: 0 },
  ],

  // Admin-specific stages (traffic rendah, realistis)
  load_admin: [
    { duration: "2m", target: 10 },
    { duration: "15m", target: 10 },
    { duration: "1m", target: 20 },
    { duration: "15m", target: 20 },
    { duration: "1m", target: 30 },
    { duration: "15m", target: 30 },
    { duration: "2m", target: 0 },
  ],
  stress_admin: [
    { duration: "2m", target: 30 },
    { duration: "5m", target: 30 },
    { duration: "1m", target: 40 },
    { duration: "5m", target: 40 },
    { duration: "1m", target: 50 },
    { duration: "5m", target: 50 },
    { duration: "1m", target: 75 },
    { duration: "5m", target: 75 },
    { duration: "2m", target: 0 },
  ],
};

// =============================================================
// THRESHOLDS
//
// FIX: Hapus error_rate dari base threshold — skenario sekarang pakai
// functional_error_rate (4xx/5xx) dan sla_breach_rate (2xx tapi lambat)
// secara terpisah. error_rate lama yang mencampur keduanya sudah deprecated
// dan tidak dipakai di skenario manapun.
//
// Untuk threshold per-skenario, tambahkan di masing-masing options:
//   functional_error_rate: ["rate<0.01"],
//   sla_breach_rate:       ["rate<0.05"],
// =============================================================

export const THRESHOLDS_BASE = {
  // FIX: error_rate dihapus dari sini — sudah diganti dua metrik terpisah
  // Hanya threshold latency dan http_req_failed (k6 built-in) yang dipertahankan
  http_req_duration: ["p(95)<1000", "p(99)<2000"],
  http_req_failed: ["rate<0.01"], // k6 built-in: network-level failure (bukan app error)
};

export const THRESHOLDS_READ = {
  ...THRESHOLDS_BASE,
  http_req_duration: ["p(50)<300", "p(95)<500", "p(99)<1000"],
};

export const THRESHOLDS_WRITE = {
  ...THRESHOLDS_BASE,
  http_req_duration: ["p(50)<500", "p(95)<1000", "p(99)<2000"],
};

// =============================================================
// COMMON HEADERS
// =============================================================

export const JSON_HEADERS = { "Content-Type": "application/json" };

// =============================================================
// THINK TIME — Box-Muller transform, μ=2s, σ=0.5s
// =============================================================

export function thinkTime(mu, sigma) {
  const m = mu || 2;
  const s = sigma || 0.5;
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const t = m + s * z;
  return Math.max(0.3, t);
}

// =============================================================
// VU COUNT PER TEST TYPE — dipakai untuk validasi user pool
// Nilai ini harus >= TEST_USERS.length di auth.js
// =============================================================

export const MAX_VU = {
  load: 200,
  stress: 500,
  spike: 500,
  soak: 150,
  load_auth: 100,
  stress_auth: 300,
  spike_auth: 300,
  load_admin: 30,
  stress_admin: 75,
};
