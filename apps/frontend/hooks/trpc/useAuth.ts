"use client";

import { useCallback }   from "react";
import { useRouter }     from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { trpc }          from "@/lib/trpc";
import { queryKeys }     from "@/lib/queryClient";Q
import { ROUTES }        from "@/lib/constants";
import { ACCESS_TOKEN_KEY } from "@/lib/constants";
import { toast }         from "sonner";

// ── helpers ───────────────────────────────────────────────────
function saveToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }
}
function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

// ============================================================
// useAuth (tRPC)
// Mirrors hooks/rest/useAuth.ts interface exactly —
// components stay the same, only transport layer changes.
// ============================================================
export function useAuth() {
  const router = useRouter();
  const qc     = useQueryClient();

  // ── GET current user ──────────────────────────────────────
  const { data: user, isLoading, isError } = trpc.auth.me.useQuery(undefined, {
    retry:     false,
    staleTime: 5 * 60 * 1000,
  });

  // ── Login ─────────────────────────────────────────────────
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      saveToken(data.accessToken);
      qc.setQueryData(queryKeys.auth.me, data.user);
      toast.success(`Selamat datang, ${data.user.name}!`);
      const params = new URLSearchParams(window.location.search);
      router.push(params.get("from") ?? ROUTES.HOME);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Register ──────────────────────────────────────────────
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      saveToken(data.accessToken);
      qc.setQueryData(queryKeys.auth.me, data.user);
      toast.success("Akun berhasil dibuat!");
      router.push(ROUTES.HOME);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Logout ────────────────────────────────────────────────
  const logoutMutation = trpc.auth.logout.useMutation({
    onSettled: () => {
      clearToken();
      qc.clear();
      router.push(ROUTES.LOGIN);
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  // ── Change Password ───────────────────────────────────────
  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => toast.success("Password berhasil diubah"),
    onError:   (err) => toast.error(err.message),
  });

  return {
    user,
    isLoading,
    isAuthenticated:         !!user && !isError,
    login:                   loginMutation.mutate,
    loginAsync:              loginMutation.mutateAsync,
    isLoginLoading:          loginMutation.isPending,
    register:                registerMutation.mutate,
    isRegisterLoading:       registerMutation.isPending,
    logout,
    changePassword:          changePasswordMutation.mutate,
    isChangePasswordLoading: changePasswordMutation.isPending,
  };
}
