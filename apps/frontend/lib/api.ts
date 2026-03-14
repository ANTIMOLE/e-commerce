// ============================================================
// api.ts
// HTTP client setup — pakai httpOnly cookie, bukan localStorage
// ============================================================

import axios, { type AxiosError } from "axios";
import { API_BASE_URL } from "./constants";

// ── Axios Instance ────────────────────────────────────────────
export const api = axios.create({
  baseURL:         API_BASE_URL,
  withCredentials: true, // kirim cookie di setiap request otomatis
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

// ── Response Interceptor ──────────────────────────────────────
// Auto-refresh token kalau dapat 401
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
      if (isRefreshing) {
        // Queue request lain yang masuk saat sedang refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest!));
      }

      originalRequest!._retry = true;
      isRefreshing = true;

      try {
        // Hit endpoint refresh — cookie refreshToken dikirim otomatis
        await api.post("/auth/refresh");

        processQueue(null);
        return api(originalRequest!);
      } catch (refreshError) {
        processQueue(refreshError);
        // Redirect ke login kalau refresh juga gagal
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Error Helper ──────────────────────────────────────────────
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ??
      error.response?.data?.error   ??
      error.message                 ??
      "Terjadi kesalahan. Silakan coba lagi."
    );
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan. Silakan coba lagi.";
}