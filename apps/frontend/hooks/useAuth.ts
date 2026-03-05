"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "../lib/api";
import { queryKeys } from "../lib/queryClient";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, ROUTES } from "../lib/constants";
import type { User, LoginInput, RegisterInput } from "../types";
import { toast } from "sonner";

// ── Token helpers (localStorage) ─────────────────────────────
function saveTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  // Simpan juga di cookie supaya middleware SSR bisa baca
  document.cookie = `access_token=${access}; path=/; max-age=3600; SameSite=Lax`;
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = "access_token=; path=/; max-age=0";
}

// ── useAuth hook ──────────────────────────────────────────────
export function useAuth() {
  const router      = useRouter();
  const qc = useQueryClient();

  // ── Get current user ────────────────────────────────────
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<User>({
    queryKey: queryKeys.auth.me,
    queryFn:  async () => {
      const res = await api.get<{ success: boolean; data: User }>("/auth/me");
      return res.data.data;
    },
    enabled: typeof window !== "undefined"
      ? !!localStorage.getItem(ACCESS_TOKEN_KEY)
      : false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // ── Login ────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; user: User };
      }>("/auth/login", input);
      return res.data.data;
    },
    onSuccess: (data) => {
      saveTokens(data.accessToken, data.refreshToken);
      qc.setQueryData(queryKeys.auth.me, data.user);
      toast.success(`Selamat datang, ${data.user.name}!`);
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("from") ?? ROUTES.HOME);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  // ── Register ─────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const res = await api.post<{
        success: boolean;
        data: { accessToken: string; refreshToken: string; user: User };
      }>("/auth/register", input);
      return res.data.data;
    },
    onSuccess: (data) => {
      saveTokens(data.accessToken, data.refreshToken);
      qc.setQueryData(queryKeys.auth.me, data.user);
      toast.success("Akun berhasil dibuat!");
      router.push(ROUTES.HOME);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
  });

  // ── Logout ───────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Tetap logout meski request gagal
    } finally {
      clearTokens();
      qc.clear();
      router.push(ROUTES.LOGIN);
    }
  }, [qc, router]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isError,
    login:           loginMutation.mutate,
    loginAsync:      loginMutation.mutateAsync,
    isLoginLoading:  loginMutation.isPending,
    register:        registerMutation.mutate,
    isRegisterLoading: registerMutation.isPending,
    logout,
  };
}
