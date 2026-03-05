// ============================================================
// api.ts
// HTTP client setup untuk REST API dan tRPC client
// ============================================================

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./constants";

// ── Axios Instance (REST) ─────────────────────────────────────
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000, // 10 detik
});

// ── Request Interceptor ───────────────────────────────────────
// Otomatis attach JWT ke setiap request kalau ada token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(ACCESS_TOKEN_KEY)
        : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────────
// Auto-refresh token kalau dapat 401
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue request yang masuk saat sedang refresh
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken =
          typeof window !== "undefined"
            ? localStorage.getItem(REFRESH_TOKEN_KEY)
            : null;

        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newToken: string = data.data.accessToken;
        localStorage.setItem(ACCESS_TOKEN_KEY, newToken);

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Token expired total — force logout
        if (typeof window !== "undefined") {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
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
// Extract pesan error yang bisa ditampilkan ke user
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ??
      error.response?.data?.error ??
      error.message ??
      "Terjadi kesalahan. Silakan coba lagi."
    );
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan. Silakan coba lagi.";
}