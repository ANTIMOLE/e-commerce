// ============================================================
// api.ts
// HTTP client setup — pakai httpOnly cookie, bukan localStorage
// ============================================================
import axios, { type AxiosError } from "axios";
import { API_BASE_URL } from "./constants";

// ── Axios Instance ────────────────────────────────────────────
export const api = axios.create({
  baseURL:         API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

// ── Response Interceptor ──────────────────────────────────────
let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject:  (err: unknown) => void;
}[] = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else       prom.resolve();
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest?._retry) {
      const isRefreshRequest = originalRequest?.url?.includes("/auth/refresh") ?? false;
      const isLoginRequest   = originalRequest?.url?.includes("/auth/login")   ?? false;

      // Kalau yang gagal adalah /auth/refresh atau /auth/login sendiri,
      // jangan coba refresh lagi — langsung reject tanpa redirect.
      //
      // Catatan: /auth/me sengaja TIDAK di-skip di sini.
      // Kalau access token expired tapi refresh token masih valid,
      // interceptor perlu bisa restore session via /auth/refresh.
      // Anonymous visitor memang dapat satu ekstra refresh attempt yang
      // gagal — ini acceptable vs risiko session tidak ter-restore.
      if (isRefreshRequest || isLoginRequest) {
        processQueue(error);
        isRefreshing = false;
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest!));
      }

      originalRequest!._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh");
        processQueue(null);
        return api(originalRequest!);
      } catch (refreshError) {
        processQueue(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Error Helper ──────────────────────────────────────────────
// [FIX] Baca field-level errors dari Zod (format: { errors: { field: string[] } })
// yang dikirim oleh error.middleware.ts di backend. Sebelumnya hanya baca
// message/error sehingga user cuma lihat "Validasi gagal." tanpa tahu field mana.
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;

    // Priority 1: field-level Zod errors dari REST middleware
    // Format backend: { success: false, message: "...", errors: { field: ["msg"] } }
    if (data?.errors && typeof data.errors === "object") {
      const fieldErrors = Object.entries(data.errors as Record<string, string[]>)
        .flatMap(([field, messages]) =>
          Array.isArray(messages)
            ? messages.map((m) => `${field}: ${m}`)
            : []
        )
        .join("; ");
      if (fieldErrors) return fieldErrors;
    }

    // Priority 2: pesan generik dari backend
    return (
      (data?.message as string | undefined) ??
      (data?.error   as string | undefined) ??
      error.message                         ??
      "Terjadi kesalahan. Silakan coba lagi."
    );
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan. Silakan coba lagi.";
}
