// =============================================================
// helpers/http.js — Request wrappers for REST and tRPC
//
// REST:  standard HTTP verbs with JSON body
// tRPC:  GET queries use ?input=<encoded-json>
//        POST mutations use { json: { ...input } } body
//
// FIX: checkAndRecord() sekarang memisahkan dua metrik berbeda:
//   - functionalErrorRate : request yang return 4xx/5xx
//   - slaBreachRate       : request yang return 2xx tapi > threshold
// Keduanya tidak boleh dicampur karena konsepnya beda untuk analisis skripsi.
// =============================================================

import http from "k6/http";
import { check } from "k6";
import { JSON_HEADERS } from "./config.js";

// =============================================================
// REST HELPERS
// =============================================================

export function restGet(url, params, tags) {
  const qs = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&")
    : "";
  return http.get(url + qs, { headers: JSON_HEADERS, tags });
}

export function restPost(url, body, tags) {
  return http.post(url, JSON.stringify(body), { headers: JSON_HEADERS, tags });
}

export function restPatch(url, body, tags) {
  return http.patch(url, JSON.stringify(body), { headers: JSON_HEADERS, tags });
}

export function restDelete(url, tags) {
  return http.del(url, null, { headers: JSON_HEADERS, tags });
}

// =============================================================
// tRPC HELPERS
//
// Query  (GET): /trpc/router.procedure?input=<urlencoded-json>
// Mutation (POST): /trpc/router.procedure  body: { json: { ...input } }
// =============================================================

export function trpcQuery(baseUrl, procedure, input, tags) {
  const inputStr = input
    ? encodeURIComponent(JSON.stringify({ json: input }))
    : encodeURIComponent("{}");
  const url = `${baseUrl}/${procedure}?input=${inputStr}`;
  return http.get(url, { headers: JSON_HEADERS, tags });
}

export function trpcMutation(baseUrl, procedure, input, tags) {
  const body = JSON.stringify({ json: input ?? {} });
  return http.post(`${baseUrl}/${procedure}`, body, {
    headers: JSON_HEADERS,
    tags,
  });
}

// =============================================================
// UNIFIED REQUEST — auto-routes to REST or tRPC
// =============================================================

export function apiGet(apiType, baseUrl, restPath, trpcProc, params, tags) {
  if (apiType === "rest") return restGet(baseUrl + restPath, params, tags);
  return trpcQuery(baseUrl, trpcProc, params, tags);
}

export function apiPost(apiType, baseUrl, restPath, trpcProc, body, tags) {
  if (apiType === "rest") return restPost(baseUrl + restPath, body, tags);
  return trpcMutation(baseUrl, trpcProc, body, tags);
}

export function apiPatch(apiType, baseUrl, restPath, trpcProc, body, tags) {
  if (apiType === "rest") return restPatch(baseUrl + restPath, body, tags);
  return trpcMutation(baseUrl, trpcProc, body, tags);
}

export function apiDelete(apiType, baseUrl, restPath, trpcProc, tags) {
  if (apiType === "rest") return restDelete(baseUrl + restPath, tags);
  return trpcMutation(baseUrl, trpcProc, {}, tags);
}

// =============================================================
// RESPONSE CHECK & METRICS HELPER
//
// FIX [Critical]: Pisahkan dua konsep yang sebelumnya dicampur:
//
//   functionalErrorRate  — request yang return status 4xx/5xx
//                          Ini benar-benar "gagal" dari sisi business logic
//
//   slaBreachRate        — request 2xx yang melebihi SLA duration threshold
//                          Ini masalah performa, bukan error fungsional
//
// Sebelumnya keduanya di-OR dan masuk satu errorRate.add(!ok),
// sehingga request 200 OK tapi lambat dihitung sebagai "error". Ini salah
// secara metodologi untuk analisis perbandingan REST vs tRPC.
//
// Catatan: slaThresholdMs default 5000ms (sama dengan sebelumnya).
// Override per-endpoint kalau perlu threshold berbeda.
// =============================================================

export function checkAndRecord(
  res,
  name,
  trend,
  functionalErrorRate,
  slaBreachRate,
  errorCounter,
  slaThresholdMs,
) {
  const threshold = slaThresholdMs || 5000;

  // Cek functional: apakah status 2xx?
  const isSuccess = check(res, {
    [`${name}: status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });

  // Cek SLA: apakah duration dalam batas?
  const withinSla = check(res, {
    [`${name}: duration < ${threshold}ms`]: (r) =>
      r.timings.duration < threshold,
  });

  // Catat ke trend latency jika ada
  if (trend) trend.add(res.timings.duration);

  // Catat functional error (4xx/5xx) terpisah dari SLA breach
  if (functionalErrorRate) functionalErrorRate.add(!isSuccess);
  if (slaBreachRate) slaBreachRate.add(!withinSla);

  // Error counter hanya untuk functional error (bukan SLA breach)
  if (errorCounter && !isSuccess) {
    errorCounter.add(1);
    console.warn(
      `[WARN] ${name} | functional error | status=${res.status} | ${res.timings.duration.toFixed(0)}ms`,
    );
  }

  // Juga log SLA breach secara terpisah (bukan di errorCounter)
  if (!withinSla) {
    console.warn(
      `[SLA] ${name} | duration ${res.timings.duration.toFixed(0)}ms > threshold ${threshold}ms`,
    );
  }

  return isSuccess;
}

// =============================================================
// LEGACY WRAPPER — backward compat jika ada script lama
// yang masih pakai signature lama (4 arg: trend, errorRate, errorCounter)
// HAPUS ini setelah semua skenario sudah migrasi ke checkAndRecord baru.
// =============================================================
export function checkAndRecordLegacy(
  res,
  name,
  trend,
  errorRate,
  errorCounter,
) {
  return checkAndRecord(res, name, trend, errorRate, null, errorCounter, 5000);
}

// =============================================================
// PARSE HELPERS
// =============================================================

// Parse tRPC response body — returns the inner data or null
export function parseTRPC(res) {
  try {
    const body = JSON.parse(res.body);
    return body?.result?.data?.json ?? body?.result?.data ?? null;
  } catch {
    return null;
  }
}

// Parse REST response body — returns data field or null
export function parseREST(res) {
  try {
    const body = JSON.parse(res.body);
    return body?.data ?? null;
  } catch {
    return null;
  }
}

export function parseResponse(apiType, res) {
  if (apiType === "rest") return parseREST(res);
  return parseTRPC(res);
}
