import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const API = __ENV.API || "rest";
const REST = "http://localhost:4000/api/v1";
const TRPC = "http://localhost:4001/trpc";
const H = { "Content-Type": "application/json" };

const errorRate = new Rate("error_rate");
const rt = new Trend("response_time_ms", true);

export const options = {
  stages: [
    { duration: "20s", target: 10 },
    { duration: "1m", target: 10 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    error_rate: ["rate<0.05"],
    http_req_duration: ["p(95)<3000"],
  },
};

export function setup() {
  return { api: API };
}

export default function () {
  let r;

  if (API === "rest") {
    r = http.get(`${REST}/products?limit=12&page=1`, { headers: H });
  } else {
    // FIX: Hapus wrapper {json:} — kirim input langsung
    const input = encodeURIComponent(
      JSON.stringify({ page: 1, limit: 12 }), // ← FIX: no {json:} wrapper
    );
    r = http.get(`${TRPC}/product.getAll?input=${input}`, { headers: H });
  }

  const ok = check(r, { "products 200": (res) => res.status === 200 });
  errorRate.add(!ok);
  rt.add(r.timings.duration);

  sleep(1);
}

export function handleSummary(data) {
  const m = data.metrics;
  const dur = m.http_req_duration?.values;

  console.log(`
╔══════════════════════════════════════╗
  Mini Load Test — ${API.toUpperCase().padEnd(4)} (10 VU × 1 min)
╠══════════════════════════════════════╣
  Avg:       ${dur?.avg?.toFixed(1)}ms
  P95:       ${dur?.["p(95)"]?.toFixed(1)}ms
  P99:       ${dur?.["p(99)"]?.toFixed(1)}ms
  Req/s:     ${m.http_reqs?.values?.rate?.toFixed(1)}
  Errors:    ${((m.error_rate?.values?.rate ?? 0) * 100).toFixed(2)}%
  Total:     ${m.http_reqs?.values?.count}
╚══════════════════════════════════════╝
`);

  return {
    [`k6/results/mini_load_${API}_${Date.now()}.json`]: JSON.stringify(data),
  };
}
